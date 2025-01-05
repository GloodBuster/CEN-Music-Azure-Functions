import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import mongoose from "mongoose";
import GetUser from "../utils/GetUser";
import { Recommendations } from "../database/schema";

export async function GetRecommendations(
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

    const recommendations = await Recommendations.findOne({ userId: user.id })
      .lean()
      .exec();

    if (!recommendations) {
      return { body: JSON.stringify({ user, recommendations: [] }) };
    }

    return { body: JSON.stringify({ user, recommendations }) };
  } catch (error) {
    return {
      status: 500,
      body: JSON.stringify({ message: "Ha ocurrido un error inesperado" }),
    };
  }
}

app.http("GetRecommendations", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: GetRecommendations,
});
