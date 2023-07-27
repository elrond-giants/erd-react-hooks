# Elrond React Hooks

### Overview

This is a library of React hooks built for the MultiversX ecosystem. It aims to make it easy to authenticate, sign and
send
transactions, and query* smart contracts.

It makes authentication as easy as:

```typescript jsx
const {login} = useAuth();

await login(AuthProviderType.WEBWALLET);
```

### Install

```bash
npm install @elrond-giants/erd-react-hooks
```

`@elrond-giants/erd-react-hooks` requires react 16.8+

### Hooks

#### `useAuth`

This hook makes it easy to authenticate with xPortal App, Web Wallet, Extension, and Ledger. It offers a context provider
to keep track of the authentication status.

##### How to use

1. Wrap your components in the provided AuthContextProvider.

```typescript jsx
import {AuthContextProvider} from "@elrond-giants/erd-react-hooks";


<AuthContextProvider env={"devnet"}>
    .....
</AuthContextProvider>
```

2. Use the value provided by AuthContextProvider.

```typescript jsx
import {useAuth} from "@elrond-giants/erd-react-hooks";
import {AuthProviderType} from "@elrond-giants/erd-react-hooks/dist/types";


function AuthComponent() {
    const {address, authenticated, guardian, login, logout} = useAuth();

    return (
        <div>
            <p>address: {address}</p>
            <p>authenticated: {authenticated ? "yes" : "no"}</p>
            <p>Guarded: {guardian.guarded ? "Yes" : "No"}</p>
            <p>Pending Guardian: {guardian.pendingGuardian?.address.bech32()}</p>
            <p>Active Guardian: {guardian.activeGuardian?.address.bech32()}</p>
            <button onClick={async () => {
                await login(AuthProviderType.EXTENSION);
            }}>
                Login
            </button>
        </div>
    );
}
```

You can pass an object with a `token` to the `login` method, and it will be included in the auth signature.

```typescript
const {provider, login} = useAuth();
const token = "some_token";

await login(AuthProviderType.WALLET_CONNECT, {token});
const authSignature = provider.getSignature();
```

:grey_exclamation: When using the *Wallet Connect provider* (xPortal), you MUST set the Wallet Connect Project ID. 
You can generate the Project ID at https://cloud.walletconnect.com/sign-in.

To set it, you simply add it to the AuthContextProvider.
```typescript jsx
<AuthContextProvider env="devnet" projectId="some-id">
```

:grey_exclamation: When using the *Wallet Connect provider* (xPortal), the login method will return a promise that
resolves with a URL.
It's a usual practice to put this URL in a QR code and let users scan it with xPortal App.

:grey_exclamation: When using the *Ledger provider* you MUST set the `ledgerAccountIndex` in the options object of
the `login` method.

The `getLedgerAccounts(page?: number | undefined, pageSize?: number | undefined): Promise<string[]>` method can be used
to get a list of accounts.

```typescript
const {login, getLedgerAccounts} = useAuth();
const accounts = getLedgerAccounts();

// --------

const selectedAccountIndex = 1;
await login(AuthProviderType.LEDGER, {ledgerAccountIndex: selectedAccountIndex});
```

To use the Webview Provider, you must enable it by setting `enableWebview` to the AuthContextProvider.
```typescript jsx
<AuthContextProvider env="devnet" enableWebview={true}>
```

#### `useTransaction`

This hook makes it easy to sign and broadcast a transaction.

##### How to use

Make sure that `useTransaction` is used inside `AuthContextProvider` and the user is authenticated before trying to make
a
transaction.

```typescript jsx
import {AuthContextProvider} from "@elrond-giants/erd-react-hooks";


<AuthContextProvider env={"devnet"}>
    .....

    <TransactionComponent/>

</AuthContextProvider>
````

```typescript jsx
import {useTransaction} from "@elrond-giants/erd-react-hooks";


function TransactionComponent() {
    const {requires2FACode, makeTransaction, whenCompleted} = useTransaction();

    const sendTx = async () => {
        const txHash = await makeTransaction({
            transaction:{
                receiver: "erd.....",
                data: "test",
                value: 1000,
            },
            onBeforeSign: () => {
                console.log("Hey, sign the transaction!");
            },
            onSigned: () => {
                console.log("Transaction signed!!");
            }
        });

        const txResult = await whenCompleted(txHash, {interval: 2000});
        if (txResult.status.isExecuted()) {
            console.log("Hooray, the transaction was successful!");
        }
    };

    return <button onClick={sendTx}>make transaction</button>;
    
}
```
The transaction data can be either a `string` or a `TransactionPayload` object.

```typescript jsx
import {useTransaction} from "@elrond-giants/erd-react-hooks";
import {TransactionPayload} from "@elrondnetwork/erdjs/out";

const {makeTransaction, whenCompleted} = useTransaction();
const data: string | TransactionPayload = TransactionPayload.contractCall()
    .setFunction(new ContractFunction("SomeFunction"))
    .addArg(new BigUIntValue(10))
    .build();

```

#### Account Guardians

The `useAuth` hook provides a `guardian` object that contains information about the account guardians.

```typescript jsx
import {useAuth} from "@elrond-giants/erd-react-hooks";


const {guardian} = useAuth();

return (
    <div>
        <p>Guarded: {guardian.guarded ? "Yes" : "No"}</p>
        <p>Pending Guardian: {guardian.pendingGuardian?.address.bech32()}</p>
        <p>Active Guardian: {guardian.activeGuardian?.address.bech32()}</p>
    </div>
);

```

The transactions made from a guarded account need to be signed by the guardian. The current option is to use a service
provided by MultiversX, which uses 2-Factor Authentication (2FA) to sign the transaction.

The `requires2FACode` property of the `useTransaction` hook can be used to check if the transactions require 2FA.

When using the Browser Extension provider, the guarding is done by the extension and the 2FA is not required. For the
other providers, the transactions need to be signed by the guardian.

This package handles all the steps in an easy-to-implement way.

The `requires2FACode` will be `true` when the account is guarded and it is authenticated with a provider that does not
handle 2FA code input, otherwise it will be `false`.

You should use the `requires2FACode` to decide if you need to ask the user for the 2FA code. If you don't want to use a
custom 2FA input, the package can handle it for you using a simple browser prompt - it needs to be enabled by
setting `use2FABrowserInput` to the `AuthContextProvider`.

When you have the 2FA code, you can call the `makeTransaction` method, and pass the code to it. Then the guarding will
be handled by the package using the MultiversX service that guards transactions.

:exclamation: If you don't provide the 2FA code and the `use2FABrowserInput` is not enabled, the transaction(s) will not be guarded
and fail.

```typescript jsx
import {Address, Transaction, TransactionPayload} from "@multiversx/sdk-core/out";


const {requires2FACode, makeTransaction} = useTransaction();
const [code, setCode] = useState<string>();
const sendTransaction = async () => {
    const transaction = new Transaction({
        data: new TransactionPayload("test"),
        gasLimit: 1_000_000,
        value: 1_000,
        sender: Address.fromBech32("erd....."),
        receiver: Address.fromBech32("erd....."),
    });
    transaction.setNonce(1);
    
    const txHash = await makeTransaction({
        transaction,
        guard2FACode: code
    });
};

return (
    <div>
        {requires2FACode && (
            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
            />
        )}
        <button onClick={sendTransaction}>Make Tx</button>
    </div>
);



```

#### Caveats

:grey_exclamation: You SHOULD always provide a value for `gasLimit`. In case it is not provided, it will be computed
using `GasEstimator().forEGLDTransfer()`.

:grey_exclamation: You SHOULD always manage and set the `nonce` when sending multiple transactions.

:grey_exclamation: :grey_exclamation: When the account is authenticated with web wallet, the user will be redirected to
MultiversX website to complete the transaction and then back to your application.

You can set the `webReturnUrl` when calling `makeTransaction({webReturnUrl: ""})`. By default, it is set to
be `window.location.href`.

:grey_exclamation: :grey_exclamation: When the account is authenticated with web wallet, the `makeTransactions()` method
will not work and will throw an error. 


