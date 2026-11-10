import axios from "axios";
import { env } from "../config/env";
import { decrypt } from "../utils/crypto";
import { User } from "../models/User";
const api = axios.create({ baseURL: "https://api.github.com", headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, timeout: 15000 });
export async function exchangeCode(code: string) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) throw Object.assign(new Error("GitHub OAuth is not configured"), { statusCode: 503 });
  const { data } = await axios.post("https://github.com/login/oauth/access_token", {
    client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code
  }, { headers: { Accept: "application/json" } });
  if (!data.access_token) throw new Error("GitHub did not return an access token");
  return data.access_token as string;
}
export async function githubRequest(userId: string) {
  const user = await User.findById(userId).select("+githubTokenEncrypted");
  if (!user?.githubTokenEncrypted) throw Object.assign(new Error("Connect GitHub first"), { statusCode: 400 });
  return decrypt(user.githubTokenEncrypted);
}
export async function listRepositories(userId: string) {
  const token = await githubRequest(userId);
  const { data } = await api.get("/user/repos", { params: { per_page: 100, sort: "updated", affiliation: "owner,collaborator,organization_member" }, headers: { Authorization: `Bearer ${token}` } });
  return data.map((r: any) => ({ id: r.id, name: r.name, fullName: r.full_name, url: r.html_url, private: r.private, branch: r.default_branch, language: r.language, description: r.description }));
}
