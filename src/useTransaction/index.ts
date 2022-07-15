import {useAuth} from "../useAuth";
import {
    Address,
    GasEstimator,
    ITransactionOnNetwork,
    TokenPayment,
    Transaction,
    TransactionPayload, TransactionWatcher
} from "@elrondnetwork/erdjs/out";
import {Nonce} from "@elrondnetwork/erdjs-network-providers/out/primitives";
import {useNetworkProvider} from "../useNetworkProvider";
import {AuthProviderType} from "@elrond-giants/erdjs-auth/dist/types";
import {network} from "@elrond-giants/erdjs-auth/dist/network";
import {IPoolingOptions, ITransactionProps} from "../types";


export const useTransaction = () => {
    const {address, nonce, provider, env, increaseNonce} = useAuth();
    const networkProvider = useNetworkProvider();


    const makeTransaction = async (txData: ITransactionProps) => {
        if (!provider) {
            throw new Error("No auth provider! Make sure the account is authenticated.");
        }

        const {onBeforeSign, onSigned, webReturnUrl} = txData;
        const tx = await buildTransaction(txData);
        if (provider.getType() === AuthProviderType.WEBWALLET) {
            await sendWebTransaction(tx, webReturnUrl ?? window.location.href);
            return "";
        }

        if (typeof onBeforeSign === "function") {
            onBeforeSign();
        }

        const signedTx = await provider.signTransaction(tx);
        console.log(signedTx)

        if (typeof onSigned === "function") {
            onSigned();
        }

        try {
            // @ts-ignore
            const result = await networkProvider.sendTransaction(signedTx);
            increaseNonce();

            return result;
        } catch (e) {
            throw e;
        }

    }

    const whenCompleted = (
        txHash: string,
        options: IPoolingOptions = {}
    ): Promise<ITransactionOnNetwork> => {
        const {interval, timeout} = options
        const watcher = new TransactionWatcher(networkProvider, interval, timeout);
        return watcher.awaitCompleted({
            getHash: () => ({hex: () => txHash}),
        });
    }

    const sendWebTransaction = async (tx: Transaction, returnUrl: string) => {
        let plainTx = tx.toPlainObject();
        if (plainTx.data) {
            plainTx.data = Buffer.from(plainTx.data, "base64").toString();
        }
        let urlString = `receiver=${plainTx.receiver}&value=${plainTx.value}`
            + `&gasLimit=${plainTx.gasLimit}&nonce=${plainTx.nonce}`
            + `&data=${plainTx.data}`
            + `&callbackUrl=${returnUrl}`;

        const networkUrl = new URL(network[env].walletAddress);

        window.location.href = `${networkUrl.origin}/hook/transaction/?${urlString}`;

        return tx;

    }

    const buildTransaction = async (txData: ITransactionProps): Promise<Transaction> => {
        let {data, value, receiver, gasLimit, chainId} = txData;
        const payload = data instanceof TransactionPayload ? data : new TransactionPayload(data);
        if (value) {
            value = value instanceof TokenPayment ? value : TokenPayment.egldFromAmount(value);
        }
        if (!gasLimit) {
            gasLimit = new GasEstimator().forEGLDTransfer(payload.length());
        }
        if (!chainId) {
            chainId = await getChainId();
        }

        return new Transaction({
            value,
            gasLimit,
            sender: Address.fromBech32(address ?? ""),
            data: payload,
            nonce: new Nonce(nonce),
            receiver: new Address(receiver),
            chainID: chainId
        });
    }

    const getChainId = async (): Promise<string> => {
        const {ChainID} = await networkProvider.getNetworkConfig();

        return ChainID;
    }


    return {makeTransaction, whenCompleted};
};