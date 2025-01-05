export const getRandomSearch = (): {
  randomSearch: string;
  randomOffset: number;
} => {
  const characters = "abcdefghijklmnopqrstuvwxyz";

  const randomCharacter = characters.charAt(
    Math.floor(Math.random() * characters.length)
  );
  let randomSearch = "";

  const randomOffset = Math.floor(Math.random() * 1000);

  return { randomSearch: randomCharacter, randomOffset };
};
