use serde_json::Value;
fn xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
        .chars()
        .filter(|c| {
            *c == '\n'
                || *c == '\r'
                || *c == '\t'
                || (*c >= ' ' && *c != '\u{fffe}' && *c != '\u{ffff}')
        })
        .collect()
}
fn crc32(data: &[u8]) -> u32 {
    let mut crc = !0u32;
    for byte in data {
        crc ^= u32::from(*byte);
        for _ in 0..8 {
            crc = (crc >> 1) ^ if crc & 1 == 1 { 0xedb88320 } else { 0 };
        }
    }
    !crc
}
fn u16(out: &mut Vec<u8>, v: u16) {
    out.extend_from_slice(&v.to_le_bytes());
}
fn u32(out: &mut Vec<u8>, v: u32) {
    out.extend_from_slice(&v.to_le_bytes());
}
fn zip(files: Vec<(&str, String)>) -> Vec<u8> {
    let mut out = Vec::new();
    let mut central = Vec::new();
    let count = files.len() as u16;
    for (name, data) in files {
        let offset = out.len() as u32;
        let bytes = data.as_bytes();
        let crc = crc32(bytes);
        let size = bytes.len() as u32;
        u32(&mut out, 0x04034b50);
        u16(&mut out, 20);
        u16(&mut out, 0);
        u16(&mut out, 0);
        u16(&mut out, 0);
        u16(&mut out, 33);
        u32(&mut out, crc);
        u32(&mut out, size);
        u32(&mut out, size);
        u16(&mut out, name.len() as u16);
        u16(&mut out, 0);
        out.extend_from_slice(name.as_bytes());
        out.extend_from_slice(bytes);
        u32(&mut central, 0x02014b50);
        u16(&mut central, 20);
        u16(&mut central, 20);
        u16(&mut central, 0);
        u16(&mut central, 0);
        u16(&mut central, 0);
        u16(&mut central, 33);
        u32(&mut central, crc);
        u32(&mut central, size);
        u32(&mut central, size);
        u16(&mut central, name.len() as u16);
        u16(&mut central, 0);
        u16(&mut central, 0);
        u16(&mut central, 0);
        u16(&mut central, 0);
        u32(&mut central, 0);
        u32(&mut central, offset);
        central.extend_from_slice(name.as_bytes());
    }
    let offset = out.len() as u32;
    let size = central.len() as u32;
    out.extend(central);
    u32(&mut out, 0x06054b50);
    u16(&mut out, 0);
    u16(&mut out, 0);
    u16(&mut out, count);
    u16(&mut out, count);
    u32(&mut out, size);
    u32(&mut out, offset);
    u16(&mut out, 0);
    out
}
pub fn export(cards: &[Value]) -> Vec<u8> {
    let headers = [
        "ID",
        "Title",
        "Priority",
        "Start date",
        "Due date",
        "Story points",
        "Description",
    ];
    let keys = [
        "id",
        "title",
        "priority",
        "start_date",
        "due_date",
        "story_points",
        "description",
    ];
    let mut sheet=String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews><cols><col min=\"1\" max=\"1\" width=\"38\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"45\" customWidth=\"1\"/><col min=\"3\" max=\"7\" width=\"22\" customWidth=\"1\"/></cols><sheetData>");
    for i in 0..=cards.len() {
        sheet.push_str(&format!("<row r=\"{}\">", i + 1));
        for (col, key) in keys.iter().enumerate() {
            let text = if i == 0 {
                headers[col].to_owned()
            } else {
                let value = &cards[i - 1][*key];
                value.as_str().map(str::to_string).unwrap_or_else(|| {
                    if value.is_null() {
                        String::new()
                    } else {
                        value.to_string()
                    }
                })
            };
            sheet.push_str(&format!(
                "<c r=\"{}{}\" t=\"inlineStr\"><is><t xml:space=\"preserve\">{}</t></is></c>",
                (b'A' + col as u8) as char,
                i + 1,
                xml(&text)
            ));
        }
        sheet.push_str("</row>");
    }
    sheet.push_str(&format!(
        "</sheetData><autoFilter ref=\"A1:G{}\"/></worksheet>",
        cards.len() + 1
    ));
    zip(vec![
("[Content_Types].xml",String::from("<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/></Types>")),
("_rels/.rels",String::from("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>")),
("xl/workbook.xml",String::from("<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Tasks\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>")),
("xl/_rels/workbook.xml.rels",String::from("<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>")),("xl/worksheets/sheet1.xml",sheet)])
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn crc_matches_standard() {
        assert_eq!(crc32(b"123456789"), 0xcbf43926);
    }
    #[test]
    fn workbook_is_zip() {
        let b = export(&[serde_json::json!({"title":"=1+1"})]);
        assert_eq!(&b[..4], b"PK\x03\x04");
        let text = String::from_utf8_lossy(&b);
        assert!(text.contains("inlineStr"));
        assert!(!text.contains("<f>"));
    }
}
