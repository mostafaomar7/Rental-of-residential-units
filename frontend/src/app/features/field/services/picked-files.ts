/** Files chosen in an `<input type="file">` change event; clears the input so the same file can be picked again. */
export function pickedFiles(event: Event): File[] {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  return files;
}
