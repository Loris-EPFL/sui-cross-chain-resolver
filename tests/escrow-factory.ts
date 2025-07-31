import {id, Interface, JsonRpcProvider} from 'ethers'
import {createPublicClient, http, parseAbiItem, decodeEventLog, parseEventLogs} from 'viem'
import {mainnet} from 'viem/chains'
import Sdk from '@1inch/cross-chain-sdk'
import EscrowFactoryContract from '../dist/contracts/EscrowFactory.sol/EscrowFactory.json'

export class EscrowFactory {
    private iface = new Interface(EscrowFactoryContract.abi)
    private viemClient: any

    constructor(
        private readonly provider: JsonRpcProvider,
        private readonly address: string
    ) {
        // Create viem client with the same RPC URL as ethers provider
        const rpcUrl = (provider as any)._getConnection().url
        this.viemClient = createPublicClient({
            chain: mainnet,
            transport: http(rpcUrl)
        })
    }

    public async getSourceImpl(): Promise<Sdk.Address> {
        return Sdk.Address.fromBigInt(
            BigInt(
                await this.provider.call({
                    to: this.address,
                    data: id('ESCROW_SRC_IMPLEMENTATION()').slice(0, 10)
                })
            )
        )
    }

    public async getDestinationImpl(): Promise<Sdk.Address> {
        return Sdk.Address.fromBigInt(
            BigInt(
                await this.provider.call({
                    to: this.address,
                    data: id('ESCROW_DST_IMPLEMENTATION()').slice(0, 10)
                })
            )
        )
    }

    public async getSrcDeployEvent(blockHash: string): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
        // Get block details first to get the block number
        const block = await this.viemClient.getBlock({ blockHash: blockHash as `0x${string}` })
        
        // Create event filter for the specific block range
        const filter = await this.viemClient.createContractEventFilter({
            abi: EscrowFactoryContract.abi,
            address: this.address as `0x${string}`,
            eventName: 'SrcEscrowCreated',
            fromBlock: block.number,
            toBlock: block.number
        })

        // Get filter logs
        const logs = await this.viemClient.getFilterLogs({ filter })
        return this.processSrcEscrowCreatedLogs(logs)
    }

    public async getSrcDeployEventByBlockNumber(blockNumber: bigint): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
        // Create event filter for the specific block number
        const filter = await this.viemClient.createContractEventFilter({
            abi: EscrowFactoryContract.abi,
            address: this.address as `0x${string}`,
            eventName: 'SrcEscrowCreated',
            fromBlock: blockNumber,
            toBlock: blockNumber
        })

        // Get filter logs
        const logs = await this.viemClient.getFilterLogs({ filter })
        return this.processSrcEscrowCreatedLogs(logs)
    }

    public async getSrcDeployEventFromTxHash(txHash: string): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
        console.log(`🔍 Waiting for transaction receipt: ${txHash}`)
        
        // Wait for transaction to be mined and get receipt with increased timeout for Sepolia
        const receipt = await this.viemClient.waitForTransactionReceipt({ 
            hash: txHash as `0x${string}`,
            timeout: 60000 // 60 seconds timeout for Sepolia's slow block times
        })
        
        console.log(`✅ Transaction receipt received for block: ${receipt.blockNumber}`)
        console.log(`📝 Receipt has ${receipt.logs.length} logs`)
        
        // Parse events from the receipt logs
        const events = parseEventLogs({
            abi: EscrowFactoryContract.abi,
            logs: receipt.logs,
            eventName: 'SrcEscrowCreated'
        })
        
        console.log(`🎯 Found ${events.length} SrcEscrowCreated events`)
        
        return this.processSrcEscrowCreatedLogs(events)
    }

    private processSrcEscrowCreatedLogs(logs: any[]): [Sdk.Immutables, Sdk.DstImmutablesComplement] {
        if (logs.length === 0) {
            throw new Error('No SrcEscrowCreated events found in block')
        }

        // Take the first log (assuming one deployment per block)
        const log = logs[0]
        
        // For viem's createContractEventFilter, args should be directly accessible
        const srcImmutables = log.args.srcImmutables
        const dstImmutablesComplement = log.args.dstImmutablesComplement
        
        // Construct Sdk.Immutables from srcImmutables using proper SDK methods
        const immutables = Sdk.Immutables.new({
            orderHash: srcImmutables.orderHash,
            hashLock: Sdk.HashLock.fromString(srcImmutables.hashlock),
            maker: Sdk.Address.fromBigInt(srcImmutables.maker),
            taker: Sdk.Address.fromBigInt(srcImmutables.taker),
            token: Sdk.Address.fromBigInt(srcImmutables.token),
            amount: srcImmutables.amount,
            safetyDeposit: srcImmutables.safetyDeposit,
            timeLocks: Sdk.TimeLocks.fromBigInt(srcImmutables.timelocks)
        })

        // Construct Sdk.DstImmutablesComplement from dstImmutablesComplement using proper SDK methods
        const dstComplement = Sdk.DstImmutablesComplement.new({
            maker: Sdk.Address.fromBigInt(dstImmutablesComplement.maker),
            amount: dstImmutablesComplement.amount,
            token: Sdk.Address.fromBigInt(dstImmutablesComplement.token),
            safetyDeposit: dstImmutablesComplement.safetyDeposit
        })

        return [immutables, dstComplement]
    }
}
