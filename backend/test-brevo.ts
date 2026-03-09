import nodemailer from 'nodemailer';

async function testBrevo() {
    console.log('Testing Brevo SMTP...');
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        auth: {
            user: 'a43f08001@smtp-brevo.com',
            pass: 'TXQ2fkGj8OgKhv4c'
        }
    });

    try {
        const info = await transporter.sendMail({
            from: '"Ahizan Test" <noreply@ahizan.com>',
            to: 'makouelijah@gmail.com',
            subject: 'Test Email from Ahizan Backend',
            text: 'Hello Configuration! Your Brevo SMTP settings are working correctly.',
            html: '<b>Hello Configuration!</b> Your Brevo SMTP settings are working correctly.'
        });
        console.log('✅ Email sent successfully: %s', info.messageId);
    } catch (err) {
        console.error('❌ Failed to send Email via SMTP:', err);
    }

    console.log('\nTesting Brevo SMS API...');
    const apiKey = 'xkeysib-9a68e183621deef88ea81c36073058ebc1q5mlw63yd2u2cn0hs6jnzf2gljhr486u3dkgm2y-HCVQzrxWEUVpmh9o';
    // To send SMS via Brevo, the recipient must be in international format and API key acts as auth
    // Wait, the user didn't provide a phone number to test SMS, only 'makouelijah@gmail.com'
    // Let's test sending a transactional email via the REST API instead as well, to confirm the API key
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Ahizan API Test', email: 'noreply@ahizan.com' },
                to: [{ email: 'makouelijah@gmail.com' }],
                subject: 'Test API Email from Ahizan Backend',
                htmlContent: '<b>Hello API Configuration!</b> Your Brevo REST API key is working correctly.'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Failed to send Email via REST API:', error);
        } else {
            console.log('✅ Email sent successfully via REST API.');
        }
    } catch (err) {
        console.error('❌ Error sending Email via REST API:', err);
    }
}

testBrevo();
