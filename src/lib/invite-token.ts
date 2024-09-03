export function generateRandomToken(): string {
  // Helper function to generate a random string of a given length
  function generateRandomString(length: number): string {
    const characters = "abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }

  // Generating four segments of random strings
  const segments = [5, 4, 5, 5]; // Lengths of each segment
  const tokenParts = segments.map((segmentLength) =>
    generateRandomString(segmentLength)
  );

  return tokenParts.join("-");
}
