// API route to handle proper Azure AD logout
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postLogoutRedirectUri = searchParams.get('post_logout_redirect_uri') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Get tenant ID from environment
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  
  if (!tenantId) {
    return NextResponse.redirect(postLogoutRedirectUri);
  }
  
  // Construct Azure AD logout URL
  const azureLogoutUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`);
  azureLogoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  
  // Redirect to Azure AD logout
  return NextResponse.redirect(azureLogoutUrl.toString());
}
