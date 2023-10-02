import {neon, neonConfig} from '@neondatabase/serverless'
neonConfig.fetchConnectionCache = true
import {drizzle} from 'drizzle-orm/neon-http'

//Through an error if the Database URL is not found
if(!process.env.DATABASE_URL){
    throw new Error ('database url not found')
    }

//Connect the SQL to the neondb
const sql = neon(process.env.DATABASE_URL)

export const db = drizzle(sql)