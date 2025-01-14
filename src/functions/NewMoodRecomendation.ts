import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import GetUser from "../utils/GetUser";
import axios from "axios";
import { SpotifyAccessToken } from "../interfaces/spotify";
import {
  MoodRecommendationResponse,
  SpotifyResponse,
} from "../interfaces/recommendations";
import { Recommendations } from "../database/schema";
import mongoose from "mongoose";
import { spotifyUriToUrl } from "../utils/spotify";

export async function NewMoodRecomendation(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const headers = Object.fromEntries(request.headers.entries());
  const authorizationHeader = headers["authorization"];
  const req = await request.json();
  const mood: string = req["mood"];

  try {
    await mongoose.connect(process.env["DATABASE_URL"]);

    const user = await GetUser(
      process.env["USER_FUNCTIONS_URL"],
      authorizationHeader
    );

    const [moodResponse, spotifyAccessTokenResponse] = await Promise.all([
      axios.get<MoodRecommendationResponse>(
        process.env["MOOD_RECOMMENDER_URL"],
        {
          params: { mood },
        }
      ),
      axios.post<SpotifyAccessToken>(
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
      ),
    ]);

    const songs = moodResponse.data.canciones;
    const accessToken = spotifyAccessTokenResponse.data.access_token;

    const spotifySongs = await Promise.all([
      ...songs.map((song) =>
        axios.get<SpotifyResponse>(
          `${process.env["SPOTIFY_API_URL"]}/v1/search`,
          {
            params: {
              q: song,
              type: "track",
              limit: "1",
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )
      ),
    ]);

    const tracks = spotifySongs.map((song) => song.data.tracks.items[0]);

    const savedTracks = (
      await Recommendations.create({
        mood,
        type: "Mood",
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
    context.log(error)
    return {
      status: 500,
      body: JSON.stringify({ message: "Ha ocurrido un error inesperado" }),
    };
  }
}

app.http("NewMoodRecomendation", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: NewMoodRecomendation,
});
