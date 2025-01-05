import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import GetUser from "../utils/GetUser";
import mongoose from "mongoose";
import axios from "axios";
import { SpotifyAccessToken } from "../interfaces/spotify";
import { Track } from "../interfaces/recommendations";
import { FavoritesSongs } from "../database/schema";
import { spotifyUriToUrl } from "../utils/spotify";

export async function NewFavorite(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const headers = Object.fromEntries(request.headers.entries());
  const authorizationHeader = headers["authorization"];
  const req = await request.json();
  const spotifyTrackId: string = req["spotify_track_id"];

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

    const spotifyAccessToken = spotifyAccessTokenResponse.data.access_token;

    const [trackResponse, existingFavorite] = await Promise.all([
      axios.get<Track>(
        `${process.env["SPOTIFY_API_URL"]}/v1/tracks/${spotifyTrackId}`,
        {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
          },
        }
      ),
      FavoritesSongs.findOne({
        userId: user.id,
      })
        .lean()
        .exec(),
    ]);

    const track = trackResponse.data;

    if (existingFavorite) {
      const favoriteId = existingFavorite._id;
      const songExists = existingFavorite.songs.some(
        (song) => song.spotifyId === track.id
      );

      if (songExists) {
        await FavoritesSongs.updateOne(
          { _id: favoriteId },
          {
            $pull: {
              songs: {
                spotifyId: track.id,
              },
            },
          }
        );
      } else {
        await FavoritesSongs.updateOne(
          { _id: favoriteId },
          {
            $push: {
              songs: {
                title: track.name,
                artists: track.artists.map((artist) => artist.name),
                album: track.album.name,
                preview_url: spotifyUriToUrl(track.uri),
                spotifyId: track.id,
                album_image_url: track.album.images[0].url,
              },
            },
          }
        );
      }
    } else {
      await FavoritesSongs.create({
        userId: user.id,
        songs: [
          {
            title: track.name,
            artists: track.artists.map((artist) => artist.name),
            album: track.album.name,
            preview_url: spotifyUriToUrl(track.uri),
            spotifyId: track.id,
            album_image_url: track.album.images[0].url,
          },
        ],
      });
    }

    return {
      status: 200,
      body: JSON.stringify({ message: "Favoritos modificados correctamente" }),
    };
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({ message: "Error al modificar favoritos" }),
    };
  }
}

app.http("NewFavorite", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: NewFavorite,
});
