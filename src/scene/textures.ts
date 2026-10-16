/** Public URL for a file in public/textures (see public/textures/CREDITS.md). */
export function textureUrl(file: string) {
  return `${import.meta.env.BASE_URL}textures/${file}`;
}
