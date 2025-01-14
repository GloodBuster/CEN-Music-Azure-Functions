import { model, Schema } from "mongoose";

const songSchema = new Schema({
  title: { type: String, required: true },
  artists: { type: [String], required: true, default: [] },
  album: { type: String, required: false },
  preview_url: { type: String, required: false },
  spotifyId: { type: String, required: true },
  album_image_url: { type: String, required: false },
});

const favoritesSongsSchema = new Schema({
  userId: { type: String, required: true },
  songs: { type: [songSchema], required: true, default: [] },
});

const recommendationsSchema = new Schema({
  userId: { type: String, required: true },
  songs: { type: [songSchema], required: true, default: [] },
  type: {
    type: String,
    enum: ["Mood", "Priority", "Luck"],
    default: "Unknown",
  },
  mood: { type: String, required: false },
  date: { type: Date, required: true, default: Date.now },
  priorities: {
    type: {
      danceability: { type: Number, required: false, default: 0 },
      energy: { type: Number, required: false, default: 0 },
      famous: { type: Number, required: false, default: 0 },
    },
    required: false,
  },
});

export const FavoritesSongs = model("FavoritesSongs", favoritesSongsSchema);
export const Recommendations = model("Recommendations", recommendationsSchema);
