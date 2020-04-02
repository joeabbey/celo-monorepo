import * as functions from 'firebase-functions'
import knex from 'knex'

const DEV_MODE = process.env.NODE_ENV !== 'production' || process.env.FUNCTIONS_EMULATOR === 'true'

interface Config {
  blockchain: {
    provider: string
    blockscout: string
  }
  salt: {
    key: string
    unverifiedQueryCount: number
    verifiedQueryCount: number
    queryPerTransaction: number
  }
  db: {
    user: string
    password: string
    database: string
    host: string
  }
}

let config: Config

if (DEV_MODE) {
  console.debug('Running in dev mode')
  config = {
    blockchain: {
      // TODO [amyslawson] figure out where to point these
      provider: 'https://alfajores-forno.celo-testnet.org',
      blockscout: 'https://alfajores-blockscout.celo-testnet.org',
    },
    salt: {
      key: 'fakeSecretKey',
      unverifiedQueryCount: 2,
      verifiedQueryCount: 30,
      queryPerTransaction: 2,
    },
    db: {
      user: 'postgres',
      password: 'fakePass',
      database: 'phoneNumberPrivacy',
      host: 'fakeHost',
    },
  }
} else {
  const functionConfig = functions.config()
  config = {
    blockchain: {
      provider: functionConfig.blockchain.provider,
      blockscout: functionConfig.blockchain.blockscout,
    },
    salt: {
      key: functionConfig.salt.key,
      unverifiedQueryCount: functionConfig.salt.unverifiedQueryCount,
      verifiedQueryCount: functionConfig.salt.verifiedQueryCount,
      queryPerTransaction: functionConfig.salt.queryPerTransaction,
    },
    db: {
      user: functionConfig.db.username,
      password: functionConfig.db.pass,
      database: functionConfig.db.name,
      host: `/cloudsql/${functionConfig.db.host}`,
    },
  }
}

export const connectToDatabase = () => {
  console.debug('Creating knex instance')
  return knex({
    client: 'pg',
    connection: config.db,
    debug: DEV_MODE,
  })
}

export default config
