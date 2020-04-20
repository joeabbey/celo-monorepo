import { newKitFromWeb3 } from '@celo/contractkit'
import { privateKeyToAddress } from '@celo/utils/src/address'
import * as net from 'react-native-tcp'
import { call } from 'redux-saga/effects'
import { waitForRehydrate } from 'src/app/saga'
import { DEFAULT_FORNO_URL } from 'src/config'
import { IPC_PATH } from 'src/geth/geth'
import networkConfig from 'src/geth/networkConfig'
import { store } from 'src/redux/store'
import Logger from 'src/utils/Logger'
import { contractKitReadySelector } from 'src/web3/selectors'
import Web3 from 'web3'
import { provider } from 'web3-core'
import { Platform } from 'react-native'

// Logging tag
const tag = 'web3/contracts'

export const web3: Web3 = getWeb3ForUtils()
let contractKit = newKitFromWeb3(web3)

// TODO util functions can just be web3

function getWeb3ForUtils(): Web3 {
  Logger.debug('getting web3')
  return new Web3()
}

export async function getContractKitOutsideGenerator() {
  // TODO(anna) Keep polling until store is defined
  // 250 ms
  // make sure not blocking US
  // don't get store until it's defined
  const contractKitReady = contractKitReadySelector(store.getState())
  if (contractKitReady) {
    return contractKit
  } else {
    throw new Error('Contract Kit not yet ready')
  }
}

function getWeb3(): Web3 {
  Logger.info(
    `${tag}@getWeb3`,
    `Initializing web3, platform: ${Platform.OS}, forno mode: ${isInitiallyFornoMode()}`
  )

  if (isInitiallyFornoMode()) {
    const url = DEFAULT_FORNO_URL
    Logger.debug(`${tag}@getWeb3`, `Connecting to url ${url}`)
    return new Web3(getHttpProvider(url))
  } else {
    return new Web3(getIpcProvider())
  }
}

export function* getContractKit() {
  // TODO(anna) Keep polling until store is defined
  // 250 ms
  // make sure not blocking US
  // don't get store until it's defined
  yield call(waitForRehydrate)
  const contractKitReady = contractKitReadySelector(store.getState())
  if (contractKitReady) {
    return contractKit
  } else {
    throw new Error('Contract Kit not yet ready')
  }
}

export function isInitiallyFornoMode() {
  return networkConfig.initiallyForno
}

function getIpcProvider() {
  Logger.debug(tag, 'creating IPCProvider...')

  const ipcProvider = new Web3.providers.IpcProvider(IPC_PATH, net)
  Logger.debug(tag, 'created IPCProvider')

  // More details on the IPC objects can be seen via this
  // console.debug("Ipc connection object is " + Object.keys(ipcProvider.connection));
  // console.debug("Ipc data handle is " + ipcProvider.connection._events['data']);
  // @ts-ignore
  const ipcProviderConnection: any = ipcProvider.connection
  const dataResponseHandlerKey: string = 'data'
  const oldDataHandler = ipcProviderConnection._events[dataResponseHandlerKey]
  // Since we are modifying internal properties of IpcProvider, it is best to add this check to ensure that
  // any future changes to IpcProvider internals will cause an error instead of a silent failure.
  if (oldDataHandler === 'undefined') {
    throw new Error('Data handler is not defined')
  }
  ipcProviderConnection._events[dataResponseHandlerKey] = (data: any) => {
    if (data.toString().indexOf('"message":"no suitable peers available"') !== -1) {
      // This is Crude check which can be improved. What we are trying to match is
      // {"jsonrpc":"2.0","id":2,"error":{"code":-32000,"message":"no suitable peers available"}}
      Logger.debug(tag, `Error suppressed: ${data}`)
      return true
    } else {
      // Logger.debug(tag, `Received data over IPC: ${data}`)
      oldDataHandler(data)
    }
  }

  // In the future, we might decide to over-ride the error handler via the following code.
  // ipcProvider.on("error", () => {
  //   Logger.showError("Error occurred");
  // })
  return ipcProvider
}

function getHttpProvider(url: string): provider {
  Logger.debug(tag, 'creating HttpProvider...')
  const httpProvider = new Web3.providers.HttpProvider(url)
  Logger.debug(tag, 'created HttpProvider')
  // In the future, we might decide to over-ride the error handler via the following code.
  // provider.on('error', () => {
  //   Logger.showError('Error occurred')
  // })
  return httpProvider
}

// Mutates web3 with new provider
export function switchWeb3ProviderForSyncMode(forno: boolean) {
  if (forno) {
    contractKit = newKitFromWeb3(new Web3(getHttpProvider(DEFAULT_FORNO_URL)))
    Logger.info(
      `${tag}@switchWeb3ProviderForSyncMode`,
      `Switch contractKit provider to ${DEFAULT_FORNO_URL}`
    )
  } else {
    contractKit = newKitFromWeb3(new Web3(getIpcProvider()))
    Logger.info(`${tag}@switchWeb3ProviderForSyncMode`, `Set contractKit provider to IPC provider`)
  }
}

export function addLocalAccount(privateKey: string, isDefault: boolean = false) {
  if (!privateKey) {
    throw new Error(`privateKey is ${privateKey}`)
  }
  contractKit.addAccount(privateKey)
  if (isDefault) {
    contractKit.defaultAccount = privateKeyToAddress(privateKey)
  }
}
