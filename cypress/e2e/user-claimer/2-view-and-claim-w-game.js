/* ///////////////////////////////
// Event creation page
// /////////////////////////////*/

const admin = require( '../../fixtures/admin-user' )
const oneCode = require( `../../fixtures/one-correct-code${ Cypress.env( 'LOCAL' ) ? '' : '-ci' }` )
const request_options = {

    headers: {
        Host: new URL( Cypress.env( 'REACT_APP_publicUrl' ) ).host
    },
    failOnStatusCode: false

}

async function extract_challenge_from_url ( response ) {

    const { redirects } = response
    const [ challenge_url ] = redirects
    cy.log( `Redirect: `, challenge_url )
    const [ base, challenge_redirect ] = challenge_url.split( '/#/claim/' )
    const challenge = challenge_redirect.replace( '307: ' )
    cy.log( `Challenge extracted: ${ challenge }` )
    return challenge

}

context( 'Claimer can view valid events with game', () => {

    /* ///////////////////////////////
	// First event
	// /////////////////////////////*/

    it( 'Event 1: Creates event', function() {

        // Visit creation interface
        cy.visit( '/create?debug=true' )

        // Input the event data
        cy.get( 'input[type=file]' ).attachFile( Cypress.env( 'LOCAL' ) ? `one-correct-code.txt` : `one-correct-code-ci.txt` )
        cy.get( '#event-create-name' ).clear().type( admin.events[0].name )
        cy.get( '#event-create-email' ).clear().type( admin.email )
        cy.get( '#event-create-date' ).clear().type( admin.events[0].end )

        // Select YES to anti-farming
        cy.get( '#event-create-game-enabled' ).select( 1 )

        // Select anti-farming timing (10s)
        cy.get( '#event-create-game-duration' ).select( 1 )
        cy.log( 'Game time selected: 20s AKA 4 game turns' )

        // Create event
        cy.get( '#event-create-submit' ).click()

        // Verify that the new url is the admin interface
        cy.url().should( 'include', '/event/admin' )

        // Save the event and admin links for further use
        cy.get( 'input#admin-eventlink-public' ).invoke( 'val' ).as( 'event_1_publiclink' ).then( f => cy.log( this.event_1_publiclink ) )
        cy.get( 'input#admin-eventlink-secret' ).invoke( 'val' ).as( 'event_1_secretlink' ).then( f => cy.log( this.event_1_secretlink ) )

    } )

    it( 'Event 1: Can view event', function() {

        // Visit the public interface
        cy.visit( this.event_1_publiclink )

        // Accept disclaimer
        cy.get( '#event-view-accept-disclaimer' ).click()

        // Save the first public auth link shown
        cy.get( 'svg[data-code]' ).invoke( 'attr', 'data-code' ).as( 'event_1_public_auth_link' ).then( f => cy.log( `Event 1 public auth link: ${ this.event_1_public_auth_link }` ) )

    } )

    it( 'Event 1: Successfully redirects to challenge link and play game', function( ) {

        // Visit the public link with games
        cy.request( { ...request_options, url: `${ Cypress.env( 'REACT_APP_publicUrl' ) }/claim/${ this.event_1_public_auth_link }` } ).as( `request` )
            .then( extract_challenge_from_url )
            .then( event_1_first_challenge => {

                // Visit the challenge link
                cy.visit( `/claim/${ event_1_first_challenge }` )

                // Save challenge link
                cy.url().as( 'event_1_first_challenge_url' )

                // Check that backend redirected us to the claim page
                cy.url().should( 'include', '/#/claim' )

                // Expect the interface to check if we are human
                cy.contains( 'Verifying your humanity' )
				
                // Human game welcome screen 
                cy.contains( 'Play a game' )

                // Click start game button
                cy.contains( 'a', 'Start game' ).click()

                // Expect score text
                cy.contains( 'Score: 0 of' )

                // Find buttons in page and click the one with h1 span value
                cy.get( 'h1 span' ).invoke( 'text' ).then( ( text ) => {
                    cy.contains( 'a', text ).click( { force: true } ) 
                } )

                // Expect score text
                cy.contains( 'Score: 1 of' )

                // Find buttons in page and click the one with h1 span value
                cy.get( 'h1 span' ).invoke( 'text' ).then( ( text ) => {
                    cy.contains( 'a', text ).click( { force: true } ) 
                } )

                // Expect score text
                cy.contains( 'Score: 2 of' )

                // Expect winning screen
                cy.contains( 'You won!' )

                // Click retrieval link
                cy.contains( 'a', 'Collect your' ).click()

                // Wait for code retrieval
                cy.url().should( 'include', 'app.poap.xyz' )

                // Check if POAP link supplies one of the test codes
                cy.url().should( 'include', oneCode )

            } )
		

    } )

    it( 'Event 1: Shows code marked as used (previous redirect marked as used)', function( ) {

        // Visit the public link
        cy.visit( this.event_1_publiclink )

        // Accept disclaimer
        cy.get( '#event-view-accept-disclaimer' ).click()

        // Shows one code as claimed
        cy.contains( '1 of 1 codes' )

    } )

    it( 'Event 1: Previous challenge link no longer works', function( ) {

        // Visit the public link
        cy.visit( this.event_1_first_challenge_url )

        // Interface should indicate that the link expired
        cy.contains( 'This link was already used' )

    } )

    it( 'Event 1: Shows no codes after code is scanned', function( ) {

        // Visit public event link
        cy.visit( this.event_1_publiclink )

        // Accept disclaimer
        cy.get( '#event-view-accept-disclaimer' ).click()

        cy.contains( '1 of 1 codes' )

    } )

    it( 'Event 1: Shows error if link was used after code ran out', function( ) {

        // Visit the public link to the second code as read by simulating a scan
        cy.request( { ...request_options, url: `${ Cypress.env( 'REACT_APP_publicUrl' ) }/claim/${ this.event_1_public_auth_link }` } ).as( `request` )
            .then( extract_challenge_from_url )
            .then( event_1_second_challenge => {

                // Visit the challenge link
                cy.visit( `/claim/${ event_1_second_challenge }` )

                // Human game welcome screen 
                cy.contains( 'Play a game' )

                // Click start game button
                cy.contains( 'a', 'Start game' ).click()

                // Expect score text
                cy.contains( 'Score: 0 of' )

                // Find buttons in page and click the one with h1 span value
                cy.get( 'h1 span' ).invoke( 'text' ).then( ( text ) => {
                    cy.contains( 'a', text ).click( { force: true } ) 
                } )

                // Expect score text
                cy.contains( 'Score: 1 of' )

                // Find buttons in page and click the one with h1 span value
                cy.get( 'h1 span' ).invoke( 'text' ).then( ( text ) => {
                    cy.contains( 'a', text ).click( { force: true } ) 
                } )

                // Expect score text
                cy.contains( 'Score: 2 of' )

                // Expect winning screen
                cy.contains( 'You won!' )

                cy.on( 'window:alert', response => {
                    expect( response ).to.contain( 'No more POAPs available for this event!' )
                } )

            } )

    } )

    // Delete event 1
    it( 'Event 1: Deletes the event when clicked', function() {

        cy.visit( this.event_1_secretlink )

        cy.on( 'window:alert', response => {
            expect( response ).to.contain( 'Deletion success' )
        } )
        cy.on( 'window:confirm', response => {
            expect( response ).to.contain( 'Are you sure' )
        } )

        cy.contains( 'Delete POAP Kiosk' ).click()

        cy.url().should( 'eq', Cypress.config().baseUrl + '/' )
    } )

} )