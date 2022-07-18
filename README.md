# Elrond React Hooks

### Overview

This is a library of React hooks built for the Elrond ecosystem. It aims to make it easy to authenticate, sign and send
transactions, and query* smart contracts.

It makes authentication as easy as:

```typescript jsx
const {login} = useAuth();

await login(AuthProviderType.WEBWALLET);
```

&ast; useQuery will be available soon.

### Install

```bash
npm install @elrond-giants/erd-react-hooks
```

`@elrond-giants/erd-react-hooks` requires react 16.8+

### Hooks

#### `useAuth`

This hook makes it easy to authenticate with Maiar App, Web Wallet, Extension, and Ledger. It offers a context provider
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
    const {address, authenticated, login, logout} = useAuth();

    return (
        <div>
            <span>address: {address}</span>
            <span>authenticated: {authenticated ? "yes" : "no"}</span>
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

await login(AuthProviderType.MAIAR, {token});
const authSignature = provider.getSignature();
```

:grey_exclamation: When using the *Maiar provider*, the login method will return a promise that resolves with a URL.
It's a usual practice to put this URL in a QR code and let users scan it with Maiar App.

When using the *Ledger provider* you MUST set the `ledgerAccountIndex` in the options object of the `login` method.

The `getLedgerAccounts(page?: number | undefined, pageSize?: number | undefined): Promise<string[]>` method can be used to get a list of accounts.

```typescript
const {login, getLedgerAccounts} = useAuth();
const accounts = getLedgerAccounts();

// --------

const selectedAccountIndex = 1;
await login(AuthProviderType.LEDGER, {ledgerAccountIndex: selectedAccountIndex});
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
    const {makeTransaction, whenCompleted} = useTransaction();

    const sendTx = async () => {
        const txHash = await makeTransaction({
            receiver: "erd.....",
            data: "test",
            value: 0.001,
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

#### Caveats

:grey_exclamation: You SHOULD always provide a value for `gasLimit`. In case it is not provided, it will be computed using `GasEstimator().forEGLDTransfer()`.


:grey_exclamation: :grey_exclamation: When the account is authenticated with web wallet, the user will be redirected to elrond website to complete the transaction and then back to your application.

You can set the `webReturnUrl` when calling `makeTransaction({webReturnUrl: ""})`. By default, it is set to be `window.location.href`.

#### `useQuery` - coming soon
