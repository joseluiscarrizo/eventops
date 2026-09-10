import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("hubspot");

    // Get company details
    const companyRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${company_id}?properties=name,phone,description,createdate,hs_lastmodifieddate`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const company = await companyRes.json();

    // Get associated contacts
    const contactsRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${company_id}/associations/contacts`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const contactsAssoc = await contactsRes.json();

    let contacts = [];
    if (contactsAssoc.results && contactsAssoc.results.length > 0) {
      const ids = contactsAssoc.results.map(r => r.id);
      const batchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: ids.map(id => ({ id })),
          properties: ['firstname', 'lastname', 'email', 'phone']
        })
      });
      const batchData = await batchRes.json();
      contacts = batchData.results || [];
    }

    return Response.json({ company: company.properties, contacts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});