export const logTime = (label: string) => {
  const now = Date.now();
  return () => {
    console.log(`${label}: ${Date.now() - now} ms`);
  };
}