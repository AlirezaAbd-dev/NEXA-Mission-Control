use crate::error::AppError;
use sqlx::{QueryBuilder, Sqlite};
#[derive(Debug, PartialEq)]
pub enum Expr {
    Term(String, String, String),
    Text(String),
    And(Box<Expr>, Box<Expr>),
    Or(Box<Expr>, Box<Expr>),
    Not(Box<Expr>),
}
pub fn parse(input: &str) -> Result<Expr, AppError> {
    if input.len() > 4000 {
        return Err(AppError::Validation(
            "Search is limited to 4000 characters".into(),
        ));
    }
    let mut tokens = Vec::new();
    let mut word = String::new();
    let mut quote = None;
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if let Some(q) = quote {
            if c == q {
                quote = None
            } else {
                word.push(c)
            };
            continue;
        }
        match c {
            '\'' | '"' => quote = Some(c),
            '(' | ')' | ':' | '=' | '<' | '>' | '!' | '~' => {
                if !word.is_empty() {
                    tokens.push(std::mem::take(&mut word));
                }
                let mut op = c.to_string();
                if matches!(c, '<' | '>' | '!') && chars.peek() == Some(&'=') {
                    op.push('=');
                    chars.next();
                }
                tokens.push(op);
            }
            c if c.is_whitespace() => {
                if !word.is_empty() {
                    tokens.push(std::mem::take(&mut word));
                }
            }
            _ => word.push(c),
        }
    }
    if quote.is_some() {
        return Err(AppError::Validation("Close the quoted search value".into()));
    }
    if !word.is_empty() {
        tokens.push(word);
    }
    if tokens.len() > 200 {
        return Err(AppError::Validation("Search is too complex".into()));
    }
    let mut parser = Parser { tokens, index: 0 };
    let expr = parser.or()?;
    if parser.index != parser.tokens.len() {
        return Err(AppError::Validation("Unexpected search token".into()));
    }
    Ok(expr)
}
struct Parser {
    tokens: Vec<String>,
    index: usize,
}
impl Parser {
    fn peek(&self) -> &str {
        self.tokens
            .get(self.index)
            .map(String::as_str)
            .unwrap_or("")
    }
    fn take(&mut self) -> String {
        let s = self.peek().to_owned();
        self.index += 1;
        s
    }
    fn or(&mut self) -> Result<Expr, AppError> {
        let mut left = self.and()?;
        while self.peek().eq_ignore_ascii_case("OR") {
            self.take();
            left = Expr::Or(Box::new(left), Box::new(self.and()?));
        }
        Ok(left)
    }
    fn and(&mut self) -> Result<Expr, AppError> {
        let mut left = self.atom()?;
        while !matches!(self.peek(), "" | ")") && !self.peek().eq_ignore_ascii_case("OR") {
            if self.peek().eq_ignore_ascii_case("AND") {
                self.take();
            }
            left = Expr::And(Box::new(left), Box::new(self.atom()?));
        }
        Ok(left)
    }
    fn atom(&mut self) -> Result<Expr, AppError> {
        if self.peek().eq_ignore_ascii_case("NOT") {
            self.take();
            return Ok(Expr::Not(Box::new(self.atom()?)));
        }
        if self.peek() == "(" {
            self.take();
            let e = self.or()?;
            if self.take() != ")" {
                return Err(AppError::Validation("Close the search group".into()));
            }
            return Ok(e);
        }
        let field = self.take();
        if matches!(field.as_str(), "" | ")" | "OR" | "AND") {
            return Err(AppError::Validation("Expected a search term".into()));
        }
        if matches!(
            self.peek(),
            ":" | "=" | "!=" | "<" | ">" | "<=" | ">=" | "~"
        ) {
            let op = self.take();
            let value = self.take();
            if matches!(value.as_str(), "" | ")" | "(") {
                return Err(AppError::Validation("Expected a filter value".into()));
            }
            Ok(Expr::Term(field.to_lowercase(), op, value))
        } else {
            Ok(Expr::Text(field))
        }
    }
}
pub fn push<'a>(
    qb: &mut QueryBuilder<'a, Sqlite>,
    expr: &Expr,
    user: &str,
) -> Result<(), AppError> {
    match expr {
        Expr::And(a, b) | Expr::Or(a, b) => {
            qb.push("(");
            push(qb, a, user)?;
            qb.push(if matches!(expr, Expr::And(..)) {
                " AND "
            } else {
                " OR "
            });
            push(qb, b, user)?;
            qb.push(")");
        }
        Expr::Not(a) => {
            qb.push("NOT (");
            push(qb, a, user)?;
            qb.push(")");
        }
        Expr::Text(text) => {
            qb.push("c.id IN(SELECT id FROM cards_fts WHERE cards_fts MATCH ")
                .push_bind(format!("\"{}\"", text.replace('"', "\"\"")))
                .push(")");
        }
        Expr::Term(field, operator, value) => {
            let op = if operator == ":" {
                "="
            } else {
                operator.as_str()
            };
            match field.as_str() {
                "priority" => {
                    crate::features::enterprise::service::validate_priority(value)?;
                    compare(qb, "c.priority", op, value)?;
                }
                "status" => {
                    if !matches!(op, "=" | "!=") {
                        return Err(AppError::Validation(
                            "Status supports equality or inequality".into(),
                        ));
                    }
                    if op == "!=" {
                        qb.push("NOT ");
                    }
                    qb.push("(col.type=")
                        .push_bind(value.clone())
                        .push(" COLLATE NOCASE OR col.name=")
                        .push_bind(value.clone())
                        .push(" COLLATE NOCASE)");
                }
                "project" => {
                    if !matches!(op, "=" | "!=") {
                        return Err(AppError::Validation(
                            "Project supports equality or inequality".into(),
                        ));
                    }
                    if op == "!=" {
                        qb.push("NOT ");
                    }
                    qb.push("(p.id=")
                        .push_bind(value.clone())
                        .push(" OR p.identifier=")
                        .push_bind(value.clone())
                        .push(" COLLATE NOCASE)");
                }
                "assignee" | "label" | "type" => {
                    if !matches!(op, "=" | "!=") {
                        return Err(AppError::Validation(
                            "This field supports equality or inequality".into(),
                        ));
                    }
                    if op == "!=" {
                        qb.push("NOT ");
                    }
                    match field.as_str() {
                        "assignee" => {
                            let v = if value == "me" {
                                user.to_owned()
                            } else {
                                value.clone()
                            };
                            qb.push("EXISTS(SELECT 1 FROM card_assignees a JOIN users u ON u.id=a.user_id WHERE a.card_id=c.id AND (u.id=").push_bind(v.clone()).push(" OR u.username=").push_bind(v).push("))");
                        }
                        "label" => {
                            qb.push("EXISTS(SELECT 1 FROM card_labels l JOIN labels t ON t.id=l.label_id WHERE l.card_id=c.id AND (t.id=").push_bind(value.clone()).push(" OR t.name=").push_bind(value.clone()).push(" COLLATE NOCASE))");
                        }
                        _ => {
                            qb.push("EXISTS(SELECT 1 FROM card_productivity cp JOIN project_work_types t ON t.id=cp.work_type_id WHERE cp.card_id=c.id AND t.name=").push_bind(value.clone()).push(" COLLATE NOCASE)");
                        }
                    }
                }
                "overdue" => {
                    if !matches!(value.as_str(), "true" | "false") {
                        return Err(AppError::Validation("Overdue must be true or false".into()));
                    }
                    if (value == "false") ^ (op == "!=") {
                        qb.push("NOT ");
                    }
                    qb.push("(c.due_date IS NOT NULL AND substr(c.due_date,1,10)<date('now') AND col.type!='done')");
                }
                "points" | "hours" => {
                    let n: f64 = value.parse().map_err(|_| {
                        AppError::Validation("Estimate comparison needs a number".into())
                    })?;
                    if !n.is_finite() {
                        return Err(AppError::Validation("Invalid number".into()));
                    }
                    let column = if field == "points" {
                        "c.story_points"
                    } else {
                        "c.estimated_hours"
                    };
                    let operator = sql_operator(op)?;
                    qb.push(column).push(operator).push_bind(n);
                }
                "due" | "created" | "updated" => {
                    let date = if value == "today" {
                        chrono::Utc::now().date_naive().to_string()
                    } else {
                        value.clone()
                    };
                    crate::features::enterprise::service::validate_date(&date)?;
                    let column = match field.as_str() {
                        "due" => "substr(c.due_date,1,10)",
                        "created" => "substr(c.created_at,1,10)",
                        _ => "substr(c.updated_at,1,10)",
                    };
                    compare(qb, column, op, &date)?;
                }
                _ => {
                    return Err(AppError::Validation(format!(
                        "Unknown search field: {field}"
                    )))
                }
            }
        }
    }
    Ok(())
}
fn sql_operator(op: &str) -> Result<&str, AppError> {
    match op {
        "=" => Ok("="),
        "!=" => Ok("!="),
        "<" => Ok("<"),
        ">" => Ok(">"),
        "<=" => Ok("<="),
        ">=" => Ok(">="),
        _ => Err(AppError::Validation("Unsupported comparison".into())),
    }
}
fn compare<'a>(
    qb: &mut QueryBuilder<'a, Sqlite>,
    column: &str,
    op: &str,
    value: &str,
) -> Result<(), AppError> {
    let operator = sql_operator(op)?;
    qb.push(column).push(operator).push_bind(value.to_owned());
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn precedence_and_quotes() {
        let e = parse("priority:high OR (label = 'Customer Bug' AND NOT status:done)").unwrap();
        assert!(matches!(e, Expr::Or(..)));
    }
    #[test]
    fn rejects_unclosed_and_overlong() {
        assert!(parse("(priority:high").is_err());
        assert!(parse("label:'unfinished").is_err());
        assert!(parse(&"x".repeat(4001)).is_err());
    }
}
