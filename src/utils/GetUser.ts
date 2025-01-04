import axios from "axios";
import { User, UserResponse } from "../interfaces/user";

const GetUser = async (url: string, token: string): Promise<User> => {
  const response = await axios.get<UserResponse>(`${url}/MyUser`, {
    headers: { Authorization: token },
  });
  return response.data.user;
};

export default GetUser;
