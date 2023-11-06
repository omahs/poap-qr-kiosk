import { Button, CardContainer, Container, Divider, H1, HeroIcon, Input, Text } from "@poap/poap-components"
import ViewWrapper from "../molecules/ViewWrapper"
import { ReactComponent as WelldoneIcon } from '../../assets/illustrations/well_done.svg'
import { ReactComponent as Diamond } from '../../assets/illustrations/valuable-diamond.svg'
import { useProbableMintAddress } from "../../hooks/minter"
import { useEffect, useState } from "react"
import { log } from "../../modules/helpers"
import Loading from "../molecules/Loading"
import { mint_code_to_address } from "../../modules/firebase"
import { useParams } from "react-router-dom"
import { eth_address_or_ens_regex, valid_email_regex } from "../../modules/validations"
import { serveToast } from '../molecules/Toast'
import Confetti from "../atoms/Confetti"

export default function MintPOAP() {

    const { probable_user_address, address_in_query } = useProbableMintAddress()
    const [ address_to_mint_to, set_address_to_mint_to ] = useState( probable_user_address )
    const [ loading, set_loading ] = useState( false )
    const { claim_code, challenge_code } = useParams(  )
    const [ claim_success, set_claim_success ] = useState(  )

    // If a probable address is found, and the user did not supply an address, set the address to state
    useEffect( (  ) => {

        // Set found probable address
        if( !address_to_mint_to?.length && probable_user_address ) set_address_to_mint_to( probable_user_address )

    }, [ probable_user_address ] )

    // If an address was supplied in the url on mount, mint to it directly
    useEffect( (  ) => {	

        // If no valid address in query, exit
        if( !address_in_query ) return
        if( !address_to_mint_to?.match( eth_address_or_ens_regex ) ) return

        // Trigger mint, this handles loading states etc, note it's a promise
        handle_mint()

    }, [ address_in_query, address_to_mint_to ] )

    // POAP minting
    async function handle_mint(  ) {

        try {

            log( `Minting POAP for ${ address_to_mint_to }` )
            set_loading( `Minting your POAP` )

            // Validate address based on address or email
            if( !address_to_mint_to?.match( eth_address_or_ens_regex ) && !address_to_mint_to?.match( valid_email_regex ) ) {
                throw new Error( 'Please input a valid Ethereum address/ENS or email address.' )
            }

            const { data: { error } } = await mint_code_to_address( { claim_code, address_to_mint_to, challenge_code } )
            if( error ) throw new Error( error )

            // Success
            set_claim_success( true )

        } catch ( e ) {
                
            log( `Error minting POAP for ${ address_to_mint_to }: `, e )
            serveToast( { message: `${ e.message }`, type: 'error' } )


        } finally {
            set_loading( false )
        }

    }

    // Loading message
    if( loading ) return <Loading message={ loading } />

    // Claim success
    if( claim_success ) return <ViewWrapper center show_bookmark>
        <Container>
            <CardContainer width='400px' margin='0 auto'>
                <WelldoneIcon />
                <H1 align='center' size='var(--fs-lg)' margin='var(--spacing-5) 0 var(--spacing-1) 0'>The minting process has started</H1>
                <Divider outline margin='0 0 var(--spacing-6) 0' />
                <Text align="center">Hundreds of computers around the world are working together to mint your POAP. When they are finished, this precious digital collectible will be yours forever on { address_to_mint_to }.</Text>
                <Text align="center">You can safely close this page.</Text>
                <Button href={ `https://app.poap.xyz/scan/${ address_to_mint_to }` }>View your POAP collection</Button>

            </CardContainer>
        </Container>
        { /* Confetti injection */ }
        <Confetti autoPlay={ true }/>
        { /* End of Confetti injection */ }
    </ViewWrapper>

    // Claim interface
    return <ViewWrapper center show_bookmark>
        <Container>
            <CardContainer width='400px' margin='0 auto'>
                <Diamond />
                <H1 align='center' size='var(--fs-lg)' margin='var(--spacing-5) 0 var(--spacing-1) 0'>Ready to mint your POAP</H1>
                <Divider outline margin='0 0 var(--spacing-6) 0' />
                <Input id="address-to-mint-to" label="Address to mint the POAP to:" placeholder='Enter your ETH address, ENS, or email' onChange={ ( { target } ) => set_address_to_mint_to( target.value ) } value={ address_to_mint_to } />
                <Button id='mint-poap-submit' onClick={ handle_mint } leftIcon={ <HeroIcon icon='sparkles' /> }>Collect your POAP</Button>

            </CardContainer>
        </Container>
    </ViewWrapper>

}