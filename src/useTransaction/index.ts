import {useAuth} from "../useAuth";
import {
    Address,
    GasEstimator,
    ITransactionOnNetwork,
    TokenPayment,
    Transaction,
    TransactionPayload, TransactionVersion,
    TransactionWatcher,
} from "@multiversx/sdk-core/out";
import {Nonce} from "@multiversx/sdk-network-providers/out/primitives";
import {useNetworkProvider} from "../useNetworkProvider";
import {AuthProviderType} from "@elrond-giants/erdjs-auth/dist/types";
import {network} from "@elrond-giants/erdjs-auth/dist/network";
import {IPoolingOptions, ITransactionProps, TransactionData} from "../types";


export const useTransaction = () => {
    const {
        address,
        nonce,
        provider,
        env,
        guardian,
        increaseNonce
    } = useAuth();
    const networkProvider = useNetworkProvider();


    const makeTransaction = async (txData: TransactionData) => {
        if (!provider) {
            throw new Error("No auth provider! Make sure the account is authenticated.");
        }

        const {
            onBeforeSign,
            onSigned,
            webReturnUrl,
            transaction
        } = txData;
        let tx: Transaction;
        if (Object.getPrototypeOf(transaction).constructor.name === Transaction.name) {
            tx = transaction as Transaction;
        } else {
            // @ts-ignore
            tx = await buildTransaction(transaction);
        }

        if (guardian.guarded && tx.getGuardian().bech32() === "") {
            tx.setGuardian(guardian.activeGuardian!.address);
            tx.setVersion(TransactionVersion.withTxOptions());
            const options = tx.getOptions();
            if (!options.isWithGuardian()) {
                options.setWithGuardian();
                tx.setOptions(options);
            }
        }

        if (provider.getType() === AuthProviderType.WEBWALLET) {
            await sendWebTransaction(tx, webReturnUrl ?? window.location.href);
            return "";
        }

        let signedTx: any = tx;
        if (needsSigning(provider.getType())) {

            if (typeof onBeforeSign === "function") {
                onBeforeSign();
            }

            signedTx = await provider.signTransaction(tx);

            if (typeof onSigned === "function") {
                onSigned();
            }
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
        const {interval, timeout, patience} = options
        const watcher = new TransactionWatcher(networkProvider, {
            pollingIntervalMilliseconds: interval,
            timeoutMilliseconds: timeout,
            patienceMilliseconds: patience,
        });

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
        let {
            data,
            value,
            receiver,
            gasLimit,
            chainId,
            options,
            guardian : _guardian,
            version
        } = txData;
        const payload = data instanceof TransactionPayload ? data : new TransactionPayload(data);
        if (value) {
            value = value instanceof TokenPayment ? value : TokenPayment.egldFromAmount(value);
        }
        if (!gasLimit) {
            let gas = new GasEstimator().forEGLDTransfer(payload.length()).valueOf();
            if (guardian.guarded) {
                gas += 50000;
            }
            gasLimit = gas;
        }
        if (!chainId) {
            chainId = await getChainId();
        }

        return new Transaction({
            chainID: chainId,
            data: payload,
            gasLimit,
            guardian: _guardian ? new Address(_guardian) : undefined,
            nonce: new Nonce(nonce),
            options,
            receiver: new Address(receiver),
            sender: Address.fromBech32(address ?? ""),
            value,
            version,
        });
    }

    const getChainId = async (): Promise<string> => {
        const {ChainID} = await networkProvider.getNetworkConfig();

        return ChainID;
    }

    const needsSigning = (providerType: AuthProviderType): boolean => {
        return [
            AuthProviderType.PEM,
            AuthProviderType.LEDGER,
            AuthProviderType.EXTENSION,
            AuthProviderType.WALLET_CONNECT,
            AuthProviderType.WEBWALLET,
            AuthProviderType.WEBVIEW
        ].includes(providerType);
    }


    return {makeTransaction, whenCompleted};
};