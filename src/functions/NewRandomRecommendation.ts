import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import mongoose from "mongoose";
import GetUser from "../utils/GetUser";
import axios from "axios";
import { SpotifyAccessToken } from "../interfaces/spotify";
import { getRandomSearch } from "../utils/randomSearch";
import { SpotifyResponse } from "../interfaces/recommendations";
import { Recommendations } from "../database/schema";
import { spotifyUriToUrl } from "../utils/spotify";

export async function NewRandomRecommendation(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const headers = Object.fromEntries(request.headers.entries());
  const authorizationHeader = headers["authorization"];

  try {
    await mongoose.connect(process.env["DATABASE_URL"]);

    const user = await GetUser(
      process.env["USER_FUNCTIONS_URL"],
      authorizationHeader
    );

    const spotifyAccessTokenResponse = await axios.post<SpotifyAccessToken>(
      process.env["SPOTIFY_TOKEN_URL"],
      {
        grant_type: "client_credentials",
        client_id: process.env["SPOTIFY_CLIENT_ID"],
        client_secret: process.env["SPOTIFY_CLIENT_SECRET"],
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = spotifyAccessTokenResponse.data.access_token;
    const randomSearch = getRandomSearch();

    const spotifySongs = await axios.get<SpotifyResponse>(
      `${process.env["SPOTIFY_API_URL"]}/v1/search`,
      {
        params: {
          q: randomSearch.randomSearch,
          type: "track",
          limit: "10",
          offset: randomSearch.randomOffset,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const tracks = spotifySongs.data.tracks.items;

    const savedTracks = (
      await Recommendations.create({
        type: "Luck",
        userId: user.id,
        songs: tracks.map((track) => ({
          title: track.name,
          artists: track.artists.map((artist) => artist.name),
          album: track.album.name,
          preview_url: spotifyUriToUrl(track.uri),
          spotifyId: track.id,
          album_image_url: track.album.images[0].url,
        })),
      })
    ).toObject();

    return { body: JSON.stringify({ user, ...savedTracks }) };
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({ message: "Ha ocurrido un error inesperado" }),
    };
  }
}

app.http("NewRandomRecommendation", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: NewRandomRecommendation,
});
