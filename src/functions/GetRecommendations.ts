import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import mongoose from "mongoose";

export async function GetRecommendations(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  await mongoose.connect(process.env["DATABASE_URL"]);
  console.log("🚀 Database connected");

  return { body: `Hello!` };
}

app.http("GetRecommendations", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetRecommendations,
});
