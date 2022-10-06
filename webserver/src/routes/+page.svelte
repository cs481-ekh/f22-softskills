<html lang="en" class="forBack">
    <body class="mainArea">
        <script
            src="https://accounts.google.com/gsi/client"
            async
            defer></script>
        <div
            id="g_id_onload"
            data-client_id="480000320991-3h6eq67pprqjk6so5m5ajmgvls8b5sbe.apps.googleusercontent.com"
            data-login_uri="https://localhost:5173/login"
            data-auto_prompt="false"
        />
        <div class="middleBox">
            <div class="centerBanner">
                <h1>Sign in with Google</h1>
                <p>Sign in with Google to access your account</p>
            </div>

            <div
                class="g_id_signin"
                data-type="standard"
                data-size="large"
                data-theme="outline"
                data-text="sign_in_with"
                data-shape="rectangular"
                data-logo_alignment="center"
            />
        </div>
    </body>
</html>

<style>
    .mainArea {
        background-image: url(https://d25vtythmttl3o.cloudfront.net/uploads/sites/42/2019/08/flag_field_mbs.jpg);
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        height: 100vh;
        width: 100vw;
        display: flex;
        justify-content: center;
    }

    .g_id_signin {
        display: grid;
        margin: 0% auto;
        width: 240px;
    }
    .centerBanner {
        display: grid;
        place-items: center;
        align-content: center;
        margin-bottom: 20px;
        margin-inline-start: 0%;
    }
    .middleBox {
        display: grid;
        margin: 19% auto;
        width: 30%;
        border: 1.5px solid #ccc;
        border-radius: 10px;
        padding: 20px;
        background-color: rgba(255, 255, 255, 0.8);
    }
    .forBack {
        font-family: 'Montserrat', sans-serif;
    }
</style>
