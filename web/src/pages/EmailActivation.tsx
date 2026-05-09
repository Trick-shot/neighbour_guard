import {Box, Grow, Stack, Typography, useMediaQuery, useTheme} from "@mui/material"
import {Player} from '@lottiefiles/react-lottie-player';
import {useEffect, useState} from "react";
import {useParams} from "react-router";
import done from '../assets/animations/Done.json'
import dotLoader from '../assets/animations/dotloader.json'
import errorAnim from '../assets/animations/error.json'
import authApi from '../api/auth.ts'

type Status = 'loading' | 'success' | 'error'

const EmailActivation = () => {
    const [status, setStatus] = useState<Status>('loading')
    const {uid, token} = useParams<{ uid: string; token: string }>();
    const theme = useTheme()
    const matches = useMediaQuery(() => theme.breakpoints.down('md'));


    useEffect(() => {
        const activate = async () => {
            try {
                await authApi.verifyEmail(uid!, token!);
                setStatus('success')
            } catch (e) {
                console.error(e)
                setStatus('error')
            }
        }
        activate();
    }, []);

    return (
        <Box sx={{
            display: "flex",
            width: "100%",
            height: "100vh",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2
        }}>
            {status === 'loading' && (
                <Player autoplay loop src={dotLoader}
                        style={{height: matches ? 100 : 156, width: matches ? 100 : 156}}/>

            )}

            {status === 'success' && (
                <Grow in={true} timeout={1500}>
                    <Stack sx={{
                        alignItems: "center",
                        gap: 1
                    }}>
                        <Player autoplay keepLastFrame loop={false} src={done}
                                style={{height: matches ? 100 : 156, width: matches ? 100 : 156}}/>
                        <Typography sx={{textAlign: "center", fontSize: "18px", marginTop: "16px",}}>Email verified
                            successfully!</Typography>
                        <Typography variant="body2" sx={{textAlign: "center", marginTop: "2px", color: "grey"}}>
                            You can now sign in to your account.
                        </Typography>
                    </Stack>
                </Grow>
            )}

            {status === 'error' && (
                <Grow in={true} timeout={500}>
                    <Stack sx={{
                        alignItems: "center",
                        gap: 1
                    }}>
                        <Player autoplay keepLastFrame loop={false} src={errorAnim} style={{height: 156, width: 156}}/>
                        <Typography sx={{textAlign: "center", fontSize: "18px",}}
                                    color="error">Activation failed</Typography>
                        <Typography variant="body2" sx={{textAlign: "center", marginTop: "1px", color: "grey"}}
                                    color="text.secondary">
                            This link may have expired or already been used.
                        </Typography>
                    </Stack>
                </Grow>
            )}
        </Box>
    )
}

export default EmailActivation;