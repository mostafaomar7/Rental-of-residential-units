/** multipart body with every file under the same field name, plus optional text fields. */
export function filesForm(field: string, files: readonly File[], extra: Record<string, string | undefined> = {}): FormData {
  const form = new FormData();
  for (const file of files) form.append(field, file);
  for (const [key, value] of Object.entries(extra)) if (value !== undefined) form.append(key, value);
  return form;
}
