import { z } from "zod"

export const UserInfo = z.object({
  sub: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
})

export type UserInfo = z.infer<typeof UserInfo>

export const MeResponse = z.object({
  user: UserInfo,
})

export type MeResponse = z.infer<typeof MeResponse>

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: UserInfo }
  | { status: "unauthenticated" }
