import schema from "./schema"
import { handlerPath } from "@libs/handlerResolver"
import { BOT_TOKEN } from "@libs/config"

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: "post",
        path: `/${BOT_TOKEN}/webhook`,
        request: {
          schemas: {
            "application/json": schema
          }
        }
      }
    }
  ]
}
