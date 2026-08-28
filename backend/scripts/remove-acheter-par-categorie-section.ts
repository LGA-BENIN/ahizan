
import { bootstrap, ChannelService, RequestContext, TransactionalConnection } from '@vendure/core';
import { vendureConfig } from '../src/vendure-config';
import { Page } from '../src/plugins/cms/entities/page.entity';
import { PageSection } from '../src/plugins/cms/entities/section.entity';

async function removeSection() {
    console.log('Starting the script to remove the section...');
    
    // Log the loaded configuration to ensure it's correct
    console.log('Vendure config loaded:', !!vendureConfig);

    // Bootstrap the Vendure application
    const app = await bootstrap(vendureConfig).catch(err => {
        console.error('Error during bootstrap:', err);
        process.exit(1);
    });
    
    console.log('Application bootstrapped successfully.');

    // Get necessary services and create a request context
    const connection = app.get(TransactionalConnection);
    const channelService = app.get(ChannelService);
    const ctx = new RequestContext({
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
        channel: await channelService.getDefaultChannel(),
    });

    // Get repositories for Page and PageSection entities
    const pageRepo = connection.getRepository(ctx, Page);
    const sectionRepo = connection.getRepository(ctx, PageSection);

    console.log('Searching for the "home" page...');
    const homePage = await pageRepo.findOne({ where: { slug: 'home' }, relations: ['sections'] });

    if (!homePage) {
        console.error('Error: The "home" page was not found. Exiting script.');
        await app.close();
        process.exit(1);
        return;
    }

    console.log(`Found the "home" page with ${homePage.sections.length} sections. Searching for the target section...`);
    let sectionToDelete = null;

    // Iterate over the sections of the home page to find the one to delete
    for (const section of homePage.sections) {
        if (section.dataJson) {
            try {
                const data = JSON.parse(section.dataJson);
                // Check if the section's title is "Acheter par catégorie"
                if (data && data.title && data.title.trim() === 'Acheter par catégorie') {
                    sectionToDelete = section;
                    break; // Exit the loop once the section is found
                }
            } catch (e) {
                // Ignore sections with invalid JSON data
            }
        }
    }

    if (sectionToDelete) {
        console.log(`Found the section to delete: ID=${sectionToDelete.id}, Title="Acheter par catégorie"`);
        try {
            // Remove the section from the database
            await sectionRepo.remove(sectionToDelete);
            console.log('The section has been successfully deleted.');
        } catch (error) {
            console.error('An error occurred while deleting the section:', error);
        }
    } else {
        console.log('The section with the title "Acheter par catégorie" was not found.');
    }

    // Close the application gracefully
    await app.close();
    console.log('Script finished.');
    process.exit(0);
}

// Run the script and handle any potential errors
removeSection().catch(err => {
    console.error('A critical error occurred while running the script:', err);
    process.exit(1);
});
