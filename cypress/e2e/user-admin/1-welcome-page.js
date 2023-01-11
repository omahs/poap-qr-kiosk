/* ///////////////////////////////
// Welcome page UX tests
// /////////////////////////////*/


context( 'Welcome page UX', () => {


    // it( 'Has a link to create a QR kiosk, protected by the Beta password', () => {

    // 	cy.visit( '/?debug=true' )

    // 	cy.contains( 'label', 'Beta password' )
    // 	cy.get( '#welcome-beta-password' ).type( 'erc721' )
		
    // 	cy.contains( 'Create POAP Kiosk' )

    // } )

    it( 'Clicking the create QR button leads to the admin interface', () => {

        cy.visit( '/?debug=true' )

        // cy.contains( 'label', 'Beta password' )
        // cy.get( '#welcome-beta-password' ).type( 'erc721' )

        cy.contains( 'Create POAP Kiosk' ).click()
        cy.url().should( 'include', '/create' )
		
    } )

} )