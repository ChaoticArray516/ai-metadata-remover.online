let pending: Promise<typeof import('./strip')> | undefined;

export function loadStrip(): Promise<typeof import('./strip')> {
  return (pending ??= import('./strip'));
}
