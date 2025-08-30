// ** import database
import { connect } from '@tidbcloud/serverless'
import { drizzle } from 'drizzle-orm/tidb-serverless'

// ** import config
import { env } from '@/config'

// ** import schema
import * as schema from './schema'

// Initialize TiDB serverless connection
const client = connect({ url: env.DATABASE_URL })
export const db = drizzle(client, { schema })