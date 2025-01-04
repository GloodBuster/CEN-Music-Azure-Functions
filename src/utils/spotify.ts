export const spotifyUriToUrl = (spotifyUri: string) => {
  const baseUrl = "https://open.spotify.com/embed/track/";
  const trackId = spotifyUri.split(":").pop();
  return baseUrl + trackId;
};
