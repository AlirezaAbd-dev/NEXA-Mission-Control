const legacyPrefix = ["task", "flow"].join("");
for (const suffix of ["token", "theme"]) {
  const key = "mission_control_" + suffix;
  const oldKey = legacyPrefix + "_" + suffix;
  const oldValue = localStorage.getItem(oldKey);
  if (!localStorage.getItem(key) && oldValue !== null)
    localStorage.setItem(key, oldValue);
  localStorage.removeItem(oldKey);
}
