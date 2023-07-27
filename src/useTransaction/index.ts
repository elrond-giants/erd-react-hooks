import {useAuth} from "../useAuth";
import {
    Address,
    GasEstimator,
    ITransactionOnNetwork,
    TokenTransfer,
    Transaction,
    TransactionPayload,
    TransactionVersion,
    TransactionWatcher,
} from "@multiversx/sdk-core/out";
import {Nonce} from "@multiversx/sdk-network-providers/out/primitives";
import {useNetworkProvider} from "../useNetworkProvider";
import {AuthProviderType} from "@elrond-giants/erdjs-auth/dist/types";
import {network} from "@elrond-giants/erdjs-auth/dist/network";
import {IPoolingOptions, ITransactionProps, TransactionData, TransactionsData} from "../types";
import {
    guardTransactions as _guardTransactions,
    requiresGuardianSignature,
    shouldApplyGuardianSignature
} from "../utils";
import {useMemo} from "react";


export const useTransaction = () => {
    const {
        address,
        nonce,
        provider,
        env,
        guardian,
        use2FABrowserInput,
        increaseNonce
    } = useAuth();
    const networkProvider = useNetworkProvider();
    const requires2FACode = useMemo(() => {
        if (!provider) {
            return false;
        }
        return shouldApplyGuardianSignature(provider.getType()) && guardian.guarded;
    }, [provider, guardian]);


    const makeTransaction = async (txData: TransactionData) => {
        if (!provider) {
            throw new Error("No auth provider! Make sure the account is authenticated.");
        }

        const {
            onBeforeSign,
            onSigned,
            webReturnUrl,
            transaction,
            guard2FACode
        } = txData;

        let tx = await prepareTransaction(transaction);

        if (provider.getType() === AuthProviderType.WEBWALLET) {
            await sendWebTransaction(tx, webReturnUrl ?? window.location.href);
            return "";
        }

        if (requiresGuardianSignature(tx)) {
            const guardedTx = await guardTransactions([tx], guard2FACode);
            tx = guardedTx[0];
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

    const makeTransactions = async (txData: TransactionsData) => {
        if (!provider) {
            throw new Error("No auth provider! Make sure the account is authenticated.");
        }

        if (provider.getType() === AuthProviderType.WEBWALLET) {
            throw new Error("Web wallet does not support multiple transactions yet.");
        }

        const {
            onBeforeSign,
            onSigned,
            webReturnUrl,
            transactions,
            guard2FACode
        } = txData;

        let txs = await Promise.all(transactions.map(async (tx) => {
            return await prepareTransaction(tx);
        }));


        if (guardian.guarded) {
            txs = await guardTransactions(txs, guard2FACode);
        }

        let signedTxs: Transaction[] = txs;
        if (needsSigning(provider.getType())) {

            if (typeof onBeforeSign === "function") {
                onBeforeSign();
            }

            signedTxs = await provider.signTransactions(txs);

            if (typeof onSigned === "function") {
                onSigned();
            }
        }

        return await networkProvider.sendTransactions(signedTxs);

    };

    const prepareTransaction = async (
        transaction: ITransactionProps | Transaction
    ): Promise<Transaction> => {
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

        return tx;
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



    const signWebTransactions = async (txs: Transaction[], returnUrl?: string) => {
        // If no return url is provided, we will use the default one set on provider.
        // We'll make the process cleaner in a future release.
        if (!returnUrl) {
            return provider!.signTransactions(txs);
        }

        return provider!.getBaseProvider().signTransactions(txs, {
            callbackUrl: returnUrl
        });
    }

    const buildTransaction = async (txData: ITransactionProps): Promise<Transaction> => {
        let {
            data,
            value,
            receiver,
            gasLimit,
            chainId,
            options,
            guardian: _guardian,
            version,
            nonce: _nonce
        } = txData;
        const payload = data instanceof TransactionPayload ? data : new TransactionPayload(data);
        if (value) {
            value = value instanceof TokenTransfer ? value : TokenTransfer.egldFromAmount(value);
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
            nonce: new Nonce(_nonce ?? nonce),
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
    };

    const guardTransactions = async (transactions: Transaction[], code?: string) => {
        if (code) {
            return _guardTransactions(transactions, code, env);
        }
        // If the code was not provided and the provider can handle
        // the guardian signature, we'll let the provider handle it.
        if (!shouldApplyGuardianSignature(provider!.getType())) {
            return transactions;
        }
        if (!use2FABrowserInput) {
            // We won't guard transactions if there is no code provided and the
            // 2FA browser input is disabled.
            return transactions;
        }
        const inputCode = prompt("Please enter your 2FA code");
        if (inputCode) {
            return _guardTransactions(transactions, inputCode, env);
        }

        return transactions;

    };

    return {requires2FACode, makeTransaction, makeTransactions, whenCompleted};
};