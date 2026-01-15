
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking users in database...");

    // Check for demo users
    const users = await prisma.user.findMany({
        where: {
            email: {
                in: ['superadmin@demo.com', 'admin@demo.com']
            }
        }
    });

    console.log(`Found ${users.length} users.`);

    if (users.length > 0) {
        users.forEach(u => {
            console.log(`- ${u.email} (Role: ${u.role})`);
            // verify password
            bcrypt.compare('demo123', u.password).then(match => {
                console.log(`  Password 'demo123' match for ${u.email}: ${match}`);
            });
        });
    } else {
        console.log("No demo users found!");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        // Wait a bit for bcrypt compare to log
        await new Promise(resolve => setTimeout(resolve, 1000));
        await prisma.$disconnect();
    });
