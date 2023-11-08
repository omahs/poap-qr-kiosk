const { db, dataFromSnap } = require( "./firebase" )
const { log } = require( "./helpers" )
const { validate: validate_uuid } = require( 'uuid' )

exports.export_emails_of_static_drop = async ( data, context ) => {

    // Function dependencies
    const { call_poap_endpoint } = require( "./poap_api" )
    const Papa = require( 'papaparse' )

    try {

        /* ///////////////////////////////
        // Validations */

        // Destructure inputs
        log( `Export called with `, data )
        const { drop_id, secret_code, auth_code } = data

        // Grab internal drop config
        const drop_config = await db.collection( `static_drop_private` ).doc( drop_id ).get().then( dataFromSnap )
        log( `Received drop config: `, drop_config )

        // Validate config versus inputs
        if( !drop_config?.approved ) throw new Error( `This drop was not aproved` )
        if( drop_config?.auth_code !== auth_code ) throw new Error( `Invalid authentication token` )

        // Validate inputs with POAP api
        const { valid } = await call_poap_endpoint( `/event/validate`, { event_id: drop_id, secret_code }, 'POST', 'json' )
        log( `POAP secret_code valid: `, valid )
        if( !valid ) throw new Error( `Invalid secret code` )

        /* ///////////////////////////////
        // Email export */

        // Grab email signups of this event
        const signups = await db.collection( `static_drop_claims` ).where( 'drop_id', '==', `${ drop_id }` ).get().then( dataFromSnap )

        // Generate csv string
        const csv_string = Papa.unparse( signups )

        // Send csv
        return { csv_string }


    } catch ( e ) {
        log( `Error exporting emails: `, e )
        return { error: e.message }
    }

}

exports.delete_emails_of_static_drop = async ( data, context ) => {

    // Function dependencies
    const { call_poap_endpoint } = require( "./poap_api" )
    const { throttle_and_retry } = require( "./helpers" )

    try {

        /* ///////////////////////////////
        // Validations */

        // Destructure inputs
        log( `Export called with `, data )
        const { drop_id, secret_code, auth_code } = data

        // Grab internal drop config
        const drop_config = await db.collection( `static_drop_private` ).doc( drop_id ).get().then( dataFromSnap )
        log( `Received drop config: `, drop_config )

        // Validate config versus inputs
        if( !drop_config?.approved ) throw new Error( `This drop was not aproved` )
        if( drop_config?.auth_code !== auth_code ) throw new Error( `Invalid authentication token` )

        // Validate inputs with POAP api
        const { valid } = await call_poap_endpoint( `/event/validate`, { event_id: drop_id, secret_code }, 'POST', 'json' )
        log( `POAP secret_code valid: `, valid )
        if( !valid ) throw new Error( `Invalid secret code` )

        /* ///////////////////////////////
        // Email deletion */

        // Delete all email entries related to this drop
        const { docs: emails_to_delete } = await db.collection( `static_drop_claims` ).where( 'drop_id', '==', `${ drop_id }` ).get()
        log( `Found ${ emails_to_delete?.length || 0 } emails to delete` )
        const email_deletion_queue = emails_to_delete.map( doc => () => doc.ref.delete() )
        return throttle_and_retry( email_deletion_queue, 500, `email_deletion`, 2, 5 )

    } catch ( e ) {
        log( `Error deleting emails: `, e )
        return { error: e.message }
    }

}

exports.create_static_drop = async ( data, context ) => {

    try {

        /* ///////////////////////////////
        // Validations */

        // Destructure inputs
        log( `Create called with `, data )
        const { drop_id, auth_code, optin_text, welcome_text, custom_css, custom_email, allow_wallet_claim } = data

        // Validate config versus inputs
        if( !drop_id?.match( /\d*/ ) ) throw new Error( `Drop ID is invalid, it should be only digits` )
        if( !validate_uuid( auth_code ) ) throw new Error( `Auth code is not a valid uuid` )

        // Store drop config
        const drop_config = {
            auth_code,
            ... optin_text?.length && { optin_text } ,
            ... welcome_text?.length && { welcome_text } ,
            ... custom_css?.length && { custom_css } ,
            ... custom_email?.length && { custom_email } ,
            ... allow_wallet_claim && { allow_wallet_claim } ,
            approved: false,
            updated: Date.now(), updated_human: new Date().toString()
        }
        await db.collection( `static_drop_private` ).doc( drop_id ).set( drop_config, { merge: true } )

        // Send output
        return { success: true, drop_config }


    } catch ( e ) {
        log( `Error exporting emails: `, e )
        return { error: e.message }
    }

}

exports.update_public_static_drop_data = async function( change, context ) {

    const { after } = change
    const { drop_id } = context.params

    // If this was a deletion, delete public data
    if( !after.exists ) return db.collection( 'static_drop_public' ).doc( drop_id ).delete()

    // Destructure data, if unapproved, delete document
    const { welcome_text, optin_text, custom_css, approved, allow_wallet_claim } = after.data()
    if( !approved ) return db.collection( 'static_drop_public' ).doc( drop_id ).delete()

    // If this was an update, grab the public properties and set them
    const public_data_object = {
        ... welcome_text?.length && { welcome_text } ,
        ... optin_text?.length && { optin_text } ,
        ... custom_css?.length && { custom_css } ,
        ... allow_wallet_claim && { allow_wallet_claim } ,
        updated: Date.now(),
        updated_by: 'static_drop_private'
    }
    return db.collection( 'static_drop_public' ).doc( drop_id ).set( public_data_object, { merge: true } )

}