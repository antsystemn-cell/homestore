import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProductsTool from "./tools/search-products";
import getProductTool from "./tools/get-product";
import listMyOrdersTool from "./tools/list-my-orders";
import trackOrderTool from "./tools/track-order";
import getMyProfileTool from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "homestore-mongolia",
  title: "HomeStore Mongolia",
  version: "0.1.0",
  instructions:
    "Tools for the EasyShop / HomeStore Mongolia online store. Search the product catalog, read product details, and read the signed-in customer's own profile and orders (including delivery tracking). Prices are in MNT (₮).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProductsTool, getProductTool, listMyOrdersTool, trackOrderTool, getMyProfileTool],
});
