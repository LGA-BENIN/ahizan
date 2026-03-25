async function check() {
    let bcrypt;
    try {
        bcrypt = require('bcrypt');
        console.log('Using bcrypt');
    } catch (e) {
        try {
            bcrypt = require('bcryptjs');
            console.log('Using bcryptjs');
        } catch (e2) {
            console.error('Neither bcrypt nor bcryptjs found');
            process.exit(1);
        }
    }

    const hash = '$2b$12$vdPgvA9TNkO5eYhW0r6NP./GmZ/T4yQiCdsP6GvtfIUPShiVSTa8q';
    const password = 'eli111@gmail.com';

    console.log(`Checking password: '${password}'`);
    console.log(`Against hash:    '${hash}'`);

    const match = await bcrypt.compare(password, hash);
    console.log(`Match result: ${match}`);
    
    if (!match) {
        console.log('Generating new hash for comparison...');
        const newHash = await bcrypt.hash(password, 12);
        console.log(`New hash: ${newHash}`);
    }
}

check();
