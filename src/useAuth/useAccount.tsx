import {createContext, PropsWithChildren, useContext, useEffect, useMemo, useState} from "react";
import AuthConnector from "./AuthConnector";
import ProviderBuilder from "./ProviderBuilder";
import {AuthProviderType, IAuthProvider, NetworkEnv} from "@elrond-giants/erdjs-auth/dist/types";
import {LedgerProvider} from "@elrond-giants/erdjs-auth/dist";

type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
    [K in Keys]-?:
    Required<Pick<T, K>>
    & Partial<Record<Exclude<Keys, K>, undefined>>
}[Keys]

interface IContextProviderProps {
    connector?: AuthConnector,
    env?: NetworkEnv
}

interface IContextValue {
    address: string | null;
    authenticated: boolean;
    provider: IAuthProvider | null;
    login: (provider: AuthProviderType, options?: ILoginOptions) => Promise<string>;
    logout: () => Promise<boolean>;
    getLedgerAccounts: (page?: number | undefined, pageSize?: number | undefined) => Promise<string[]>;
}

interface ILoginOptions {
    token?: string;
    ledgerAccountIndex?: number;
}

const contextDefaultValue: IContextValue = {
    address: null,
    authenticated: false,
    provider: null,
    login: async (provider: AuthProviderType, options?: ILoginOptions) => "",
    logout: async () => true,
    getLedgerAccounts: (page?: number | undefined, pageSize?: number | undefined) => {
        return Promise.resolve([]);
    },
};

export const AuthContext = createContext(contextDefaultValue);

export const AuthContextProvider = (
    {
        connector,
        env,
        children
    }: PropsWithChildren<RequireOnlyOne<IContextProviderProps>>
) => {
    const [authConnector, setAuthConnector] = useState(() => {
        const authConnector = getConnector({connector, env});
        authConnector.onChange = () => {
            setChangedAt(Date.now());
        };

        return authConnector;
    })
    const [changedAt, setChangedAt] = useState(Date.now());

    useEffect(() => {
        if (!authConnector.initialised()) {
            (async () => {
                await authConnector.initFromStorage();
                setChangedAt(Date.now())
            })();
        }
    }, [])


    const value = useMemo(() => {
        const state = authConnector.provider?.toJson();
        return {
            address: state?.address ?? null,
            authenticated: state?.authenticated ?? false,
            provider: authConnector.provider,
            login: async (
                provider: AuthProviderType,
                {
                    token,
                    ledgerAccountIndex
                }: ILoginOptions = {}
            ) => {
                if (authConnector.provider?.getType() !== provider) {
                    await authConnector.init(provider);
                }

                if (null != ledgerAccountIndex && authConnector.provider instanceof LedgerProvider) {
                    authConnector.provider.setAccount(ledgerAccountIndex);
                }

                // @ts-ignore
                return authConnector.provider.login(token);
            },
            logout: () => {
                return authConnector.logout();
            },
            getLedgerAccounts: async (page?: number | undefined, pageSize?: number | undefined) => {
                if (
                    !authConnector.initialised()
                    || authConnector.provider?.getType() !== AuthProviderType.LEDGER
                ) {
                    await authConnector.init(AuthProviderType.LEDGER);
                }

                if (authConnector.provider instanceof LedgerProvider) {
                    return authConnector.provider.getAccounts(page, pageSize);
                }

                return [];
            },

        }

    }, [changedAt]);


    return <AuthContext.Provider value={value} children={children}/>;

}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error(`useAuth must be used within an AuthContextProvider.`);
    }
    return context;
}

const getConnector = ({connector, env}: IContextProviderProps): AuthConnector => {
    if (connector !== undefined) {return connector;}
    const providerBuilder = new ProviderBuilder(env ?? "devnet");

    return new AuthConnector(providerBuilder);
}
