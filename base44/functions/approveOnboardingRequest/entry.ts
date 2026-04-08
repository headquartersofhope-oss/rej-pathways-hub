import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can approve
    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Only admins can approve requests' },
        { status: 403 }
      );
    }

    const { request_id, final_role } = await req.json();

    if (!final_role) {
      return Response.json(
        { error: 'final_role is required' },
        { status: 400 }
      );
    }

    // Fetch the request
    const request = await base44.asServiceRole.entities.OnboardingRequest.get(
      request_id
    );
    if (!request) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    // Generate temporary login code
    const tempCode = generateTempCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create user account via base44
    let linkedUser;
    try {
      // Use base44.users.inviteUser to create the account
      await base44.users.inviteUser(request.email, final_role);
      
      // Fetch the newly created user
      const userList = await base44.asServiceRole.entities.User.filter({
        email: request.email,
      });
      linkedUser = userList[0];
    } catch (err) {
      // User might already exist
      const userList = await base44.asServiceRole.entities.User.filter({
        email: request.email,
      });
      linkedUser = userList[0];
    }

    // Create UserAccount record
    const userAccount = await base44.asServiceRole.entities.UserAccount.create({
      email: request.email,
      user_id: linkedUser?.id,
      app_role: final_role,
      status: 'invited',
      onboarding_request_id: request_id,
      temporary_login_code: tempCode,
      temporary_code_expires: expiresAt.toISOString(),
      approved_date: new Date().toISOString(),
      created_by: user.email,
    });

    // If resident, create resident record
    let linkedResidentId;
    if (final_role === 'resident' || request.request_type === 'resident_intake') {
      const resident = await base44.asServiceRole.entities.Resident.create({
        first_name: request.first_name,
        last_name: request.last_name,
        preferred_name: request.preferred_name,
        email: request.email,
        phone: request.phone,
        date_of_birth: request.date_of_birth,
        population: request.resident_data?.population,
        user_id: linkedUser?.id,
        status: 'active',
      });
      linkedResidentId = resident.id;

      // Link in user account
      await base44.asServiceRole.entities.UserAccount.update(userAccount.id, {
        linked_resident_id: resident.id,
      });

      // Create barriers from needs
      if (request.resident_data?.primary_needs?.length > 0) {
        for (const need of request.resident_data.primary_needs) {
          await base44.asServiceRole.entities.BarrierItem.create({
            global_resident_id: resident.global_resident_id,
            resident_id: resident.id,
            category: 'other',
            title: need,
            description: `Identified during intake: ${need}`,
            status: 'new',
            auto_generated: true,
          });
        }
      }
    }

    // If employer, link to employer record
    let linkedEmployerId;
    if (final_role === 'employer' && request.organization) {
      const employers = await base44.asServiceRole.entities.Employer.filter({
        company_name: request.organization,
      });

      if (employers.length > 0) {
        linkedEmployerId = employers[0].id;
      } else {
        const employer = await base44.asServiceRole.entities.Employer.create({
          company_name: request.organization,
          contact_name: `${request.first_name} ${request.last_name}`,
          contact_email: request.email,
          contact_phone: request.phone,
          status: 'pending_review',
        });
        linkedEmployerId = employer.id;
      }

      await base44.asServiceRole.entities.UserAccount.update(userAccount.id, {
        linked_employer_id: linkedEmployerId,
      });
    }

    // Send activation email
    await base44.integrations.Core.SendEmail({
      to: request.email,
      subject: 'Your Reentry & Jobs Account Has Been Approved',
      body: buildActivationEmail(
        request,
        tempCode,
        final_role
      ),
    });

    // Update the request
    await base44.asServiceRole.entities.OnboardingRequest.update(request_id, {
      linked_user_id: linkedUser?.id,
      linked_resident_id: linkedResidentId,
      final_assigned_role: final_role,
    });

    return Response.json({
      success: true,
      user_account_id: userAccount.id,
      user_id: linkedUser?.id,
      resident_id: linkedResidentId,
      employer_id: linkedEmployerId,
      temp_code: tempCode,
    });
  } catch (error) {
    console.error('Approval error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateTempCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function buildActivationEmail(request, tempCode, role) {
  return `
<h2>Welcome to Reentry & Jobs!</h2>

<p>Your access request has been approved. Your account is ready to use.</p>

<h3>Your Login Information</h3>
<p>
  <strong>Email:</strong> ${request.email}<br>
  <strong>Role:</strong> ${role.replace(/_/g, ' ')}<br>
  <strong>Temporary Code:</strong> ${tempCode}
</p>

<h3>Next Steps</h3>
<ol>
  <li><a href="">Log in to your account</a></li>
  <li>Enter your email and temporary code</li>
  <li>Create a permanent password</li>
  <li>Start using the system</li>
</ol>

<p>This temporary code will expire in 7 days. If you have questions, contact support.</p>
  `;
}