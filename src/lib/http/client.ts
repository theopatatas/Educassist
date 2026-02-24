import axios from "axios";
import { attachAuthInterceptor } from "./interceptors";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  withCredentials: true,
});

attachAuthInterceptor(api);
