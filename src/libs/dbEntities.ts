import { CookieJar } from "tough-cookie"

import { AWSS3Settings, BackupResult, TelegraphAccount } from "dedeleted"

export type BackupKey = { sourceKey: string; id: string }
export type BackupEntity = Exclude<"otherData", Exclude<"reposted", BackupResult>> & {
  // keys of reposted BackupEntities
  // `sourceKey` should be the same as the orignal BackupEntity for now
  reposted: BackupKey[]
  otherData: string
}

export interface ConfigEntity {
  userID: number
  telegraphAccount: TelegraphAccount
  isOwner?: true
  shareGroup?: string
  awsS3?: AWSS3Settings
  cookies?: CookieJar.Serialized
  twitterBearerToken?: string
}

export interface ShareGroupEntity {
  id: string
  password: string
  creatorID: number
}
