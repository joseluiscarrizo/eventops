import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3';
import { es } from 'npm:date-fns@3/locale/es';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { assignment_id, action } = await req.json();
        if (!assignment_id || (action !== 'checked_in' && action !== 'checked_out')) {
            return Response.json({ ok: true, skipped: true });
        }

        // Fetch the assignment
        const assignments = await base44.asServiceRole.entities.Assignment.filter({ id: assignment_id });
        const assignment = assignments[0];
        if (!assignment) return Response.json({ error: 'Assignment not found' }, { status: 404 });

        // Fetch the event
        const events = await base44.asServiceRole.entities.Event.filter({ id: assignment.event_id });
        const event = events[0];
        if (!event) return Response.json({ ok: true, skipped: true });

        // Fetch the staff member
        const staffList = await base44.asServiceRole.entities.StaffMember.filter({ id: assignment.staff_member_id });
        const staff = staffList[0];

        const scanTime = format(new Date(), 'HH:mm', { locale: es });
        const eventDate = event.date_start
            ? format(new Date(event.date_start), "EEEE d 'de' MMMM yyyy", { locale: es })
            : '—';
        const staffName = staff?.full_name || 'El trabajador';

        // Message to the staff member (conversation_id = staff_member_id for personal chats)
        const isCheckIn = action === 'checked_in';
        const msgToStaff = isCheckIn
            ? `✅ ASISTENCIA CONFIRMADA\n\n${eventDate} ; ${event.name || '—'} ; ${scanTime}`
            : `🔒 SERVICIO CERRADO\n\n${eventDate} ; ${event.name || '—'} ; ${scanTime}`;

        // Message to admins / coordinators (general conversation)
        const msgToAdmin = isCheckIn
            ? `✅ Check-in confirmado\n\n👤 Personal: ${staffName}\n📅 Día: ${eventDate}\n🏢 Evento: ${event.name || '—'}\n📍 Zona/Rol: ${assignment.zone || assignment.role_in_event || '—'}\n🕐 Hora de escaneo: ${scanTime}`
            : `🔒 Servicio cerrado\n\n👤 Personal: ${staffName}\n📅 Día: ${eventDate}\n🏢 Evento: ${event.name || '—'}\n📍 Zona/Rol: ${assignment.zone || assignment.role_in_event || '—'}\n🕐 Hora de escaneo: ${scanTime}`;

        // Send message to staff member chat
        if (staff) {
            await base44.asServiceRole.entities.ChatMessage.create({
                conversation_id: `staff_${assignment.staff_member_id}`,
                sender_email: 'sistema@eventops.app',
                sender_name: 'EventOps',
                sender_role: 'admin',
                text: msgToStaff,
                read_by: [],
            });

            // Also send email to staff if they have one
            if (staff.email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                    to: staff.email,
                    subject: isCheckIn ? `✅ Asistencia confirmada – ${event.name}` : `🔒 Servicio cerrado – ${event.name}`,
                    body: msgToStaff.replace(/\n/g, '<br>'),
                });
            }
        }

        // Send message to coordinators conversation
        await base44.asServiceRole.entities.ChatMessage.create({
            conversation_id: `event_${assignment.event_id}`,
            sender_email: 'sistema@eventops.app',
            sender_name: 'EventOps',
            sender_role: 'admin',
            text: msgToAdmin,
            read_by: [],
        });

        // Create in-app notification for admins
        const allUsers = await base44.asServiceRole.entities.User.list();
        const admins = allUsers.filter(u => u.role === 'admin' || u.role === 'planificador');
        for (const admin of admins) {
            await base44.asServiceRole.entities.Notification.create({
                recipient_email: admin.email,
                recipient_name: admin.full_name || admin.email,
                type: 'general',
                title: isCheckIn ? `Check-in: ${staffName}` : `Servicio cerrado: ${staffName}`,
                message: isCheckIn
                    ? `${staffName} ha confirmado asistencia al evento "${event.name}" a las ${scanTime}.`
                    : `${staffName} ha cerrado servicio en el evento "${event.name}" a las ${scanTime}.`,
                related_id: assignment.event_id,
                related_type: 'event',
                read: false,
                email_sent: false,
            });
        }

        return Response.json({ ok: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});