import { useEffect, useState } from "react";
import {
    ThemeProvider,
    defaultDarkModeOverride, Heading,
} from "@aws-amplify/ui-react";
import App from "../app";
import { Amplify, Auth } from "aws-amplify";
import { AppConfig } from "../common/types";
import { AppContext } from "../common/app-context";
import { Alert, StatusIndicator } from "@cloudscape-design/components";
import { StorageHelper } from "../common/helpers/storage-helper";
import { Mode } from "@cloudscape-design/global-styles";
import "@aws-amplify/ui-react/styles.css";
import { CHATBOT_NAME } from "../common/constants";

export default function AppConfigured() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState(StorageHelper.getTheme());

  useEffect(() => {
    (async () => {
      try {
        const result = await fetch("/aws-exports.json");
        const awsExports = await result.json();
        const currentConfig = Amplify.configure(awsExports) as AppConfig | null;

        try {
          const user = await Auth.currentAuthenticatedUser();
          if (user) {
            setIsAuthenticated(true);
          }
        } catch (e) {
          setIsAuthenticated(false);
        }

        if (currentConfig?.config.auth_federated_provider?.auto_redirect) {
          if (!isAuthenticated) {
            redirectToSSO();
          }
        }

        setConfig(currentConfig);
      } catch (e) {
        console.error(e);
        setError(true);
      }
    })();
  }, []);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          const newValue =
            document.documentElement.style.getPropertyValue(
              "--app-color-scheme"
            );

          const mode = newValue === "dark" ? Mode.Dark : Mode.Light;
          if (mode !== theme) {
            setTheme(mode);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => {
      observer.disconnect();
    };
  }, [theme]);

  const redirectToSSO = () => {
    if (config) {
      const federatedProvider = config.config.auth_federated_provider;
      if (federatedProvider) {
        if (!federatedProvider.custom) {
          Auth.federatedSignIn({ provider: federatedProvider.name });
        } else {
          Auth.federatedSignIn({customProvider: federatedProvider.name});
        }
      } else {
          console.log("auth federated provider is missing")
      }
    } else {
        console.log("configurations is missing")
    }
  };

  if (!config) {
    if (error) {
      return (
          <div
              style={{
                height: "100%",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
          >
            <Alert header="Configuration error" type="error">
              Error loading configuration from "
              <a href="/aws-exports.json" style={{ fontWeight: "600" }}>
                /aws-exports.json
              </a>
              "
            </Alert>
          </div>
      );
    }

    return (
        <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
        >
          <StatusIndicator type="loading">Loading</StatusIndicator>
        </div>
    );
  }

  if (!isAuthenticated) {
      return (
          <div
              style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100vh',
              }}
          >
              <Heading
                  level={3}
                  style={{ marginBottom: '20px' }}
              >
                  {CHATBOT_NAME}
              </Heading>
              <button
                  onClick={redirectToSSO}
                  style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      color: 'white',
                      backgroundColor: '#0d6efd', // Bootstrap primary color
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0b5ed7'} // Darken button on hover
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0d6efd'}
              >
                  Sign in with Azure
              </button>
          </div>
      );
  }

  return (
      <AppContext.Provider value={config}>
        <ThemeProvider
            theme={{
              name: "default-theme",
              overrides: [defaultDarkModeOverride],
            }}
            colorMode={theme === Mode.Dark ? "dark" : "light"}
        >
          <App />
        </ThemeProvider>
      </AppContext.Provider>
  );
}
