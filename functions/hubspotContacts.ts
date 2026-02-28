import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("hubspot");

    // Search contacts by email or name in HubSpot
    if (action === 'search_contacts') {
      const { query } = body;
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'CONTAINS_TOKEN', value: query }
              ]
            },
            {
              filters: [
                { propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: query }
              ]
            },
            {
              filters: [
                { propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: query }
              ]
            }
          ],
          properties: ['firstname', 'lastname', 'email', 'phone', 'company'],
          limit: 10
        })
      });
      const data = await res.json();
      return Response.json({ contacts: data.results || [] });
    }

    // Create a contact in HubSpot from a client record
    if (action === 'create_contact') {
      const { client_id } = body;
      const client = await base44.entities.Client.get(client_id);
      if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

      // Build contact properties
      const nameParts = (client.contact_person_1 || client.name || '').split(' ');
      const props = {
        firstname: nameParts[0] || client.name,
        lastname: nameParts.slice(1).join(' ') || '',
        email: client.email_1 || '',
        phone: client.phone_1 || '',
        company: client.name || '',
      };

      // Check if contact already exists by email
      let existingContactId = null;
      if (props.email) {
        const searchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(props.email)}?idProperty=email`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (searchRes.ok) {
          const existing = await searchRes.json();
          existingContactId = existing.id;
        }
      }

      let contactId;
      if (existingContactId) {
        // Update existing
        await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingContactId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: props })
        });
        contactId = existingContactId;
      } else {
        // Create new
        const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: props })
        });
        const created = await createRes.json();
        if (!createRes.ok) return Response.json({ error: created.message || 'Error creating contact' }, { status: 400 });
        contactId = created.id;
      }

      return Response.json({ success: true, contact_id: contactId, action: existingContactId ? 'updated' : 'created' });
    }

    // Get contact details from HubSpot by contact_id
    if (action === 'get_contact') {
      const { contact_id } = body;
      const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contact_id}?properties=firstname,lastname,email,phone,company`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await res.json();
      return Response.json({ contact: data });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});