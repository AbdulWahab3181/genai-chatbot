import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class Authentication extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognitoIdentityPool.IdentityPool;
  public readonly cognitoDomain: string;
  public readonly redirectSignIn: string;
  public readonly redirectSignOut: string;
  public readonly providerName: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const userPool = new cognito.UserPool(this, "UserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      autoVerify: { email: true, phone: true },
      signInAliases: {
        email: true,
      },
    });

    // Define the domain name for the User Pool
    const domain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: "mt-chatbot", // Unique domain prefix
      },
    });

    // Define OAuth settings
    const redirectSignIn = 'https://chatbot.mindtools.com';
    const redirectSignOut = 'https://chatbot.mindtools.com';
    const providerName = 'AzureAD';

    // Define the SAML provider
    new cognito.CfnUserPoolIdentityProvider(this, 'AzureADProvider', {
      userPoolId: userPool.userPoolId,
      providerName: providerName,
      providerType: 'SAML',
      providerDetails: {
        MetadataURL: 'https://login.microsoftonline.com/8fd870c2-fc05-47ad-9fdf-9304ea904679/federationmetadata/2007-06/federationmetadata.xml?appid=6a4f036a-1687-4ae7-9522-87ca1077eb70', // Replace with your SAML metadata
      },
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
      },
    });

    const userPoolClient = userPool.addClient("UserPoolClient", {
      oAuth: {
        callbackUrls: [redirectSignIn],
        logoutUrls: [redirectSignOut],
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE, cognito.OAuthScope.COGNITO_ADMIN],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.custom(providerName)
      ],
    });

    const identityPool = new cognitoIdentityPool.IdentityPool(
      this,
      "IdentityPool",
      {
        authenticationProviders: {
          userPools: [
            new cognitoIdentityPool.UserPoolAuthenticationProvider({
              userPool,
              userPoolClient,
            }),
          ],
        },
      }
    );

    this.userPool = userPool;
    this.userPoolClient = userPoolClient;
    this.identityPool = identityPool;
    this.cognitoDomain = domain.baseUrl().replace(/^https?:\/\//, '');
    this.redirectSignIn = redirectSignIn;
    this.redirectSignOut = redirectSignOut;
    this.providerName = providerName

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolWebClientId", {
      value: userPoolClient.userPoolClientId,
    });

    new cdk.CfnOutput(this, "UserPoolLink", {
      value: `https://${
        cdk.Stack.of(this).region
      }.console.aws.amazon.com/cognito/v2/idp/user-pools/${
        userPool.userPoolId
      }/users?region=${cdk.Stack.of(this).region}`,
    });
  }
}
