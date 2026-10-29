
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    parameters {
        booleanParam(
            name: 'PUSH_IMAGE',
            defaultValue: true,
            description: 'Push the Docker image to Docker Hub'
        )

        booleanParam(
            name: 'DEPLOY_TO_K8S',
            defaultValue: false,
            description: 'Deploy the application to Kubernetes'
        )
    }

    environment {
        IMAGE = 'mageshkavi05/coupon-system'

        DOCKER = 'C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
    }

    stages {
        stage('Checkout Verification') {
            steps {
                checkout scm
                bat 'git log -1 --oneline'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm.cmd install'
            }
        }

        stage('Run Application Tests') {
            steps {
                bat 'npm.cmd test'
            }
        }

        stage('Docker Build') {
            steps {
                bat '''
                    "%DOCKER%" build ^
                        -t "%IMAGE%:%BUILD_NUMBER%" ^
                        -t "%IMAGE%:latest" .
                '''
            }
        }

        stage('DockerHub Push') {
            when {
                expression { params.PUSH_IMAGE }
            }

            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    bat '''
                        @echo off
                        setlocal DisableDelayedExpansion

                        set "DOCKER_CONFIG=%WORKSPACE%\\docker-auth"
                        if not exist "%DOCKER_CONFIG%" mkdir "%DOCKER_CONFIG%"

                        echo ===== DockerHub Login =====
                        echo %DOCKER_TOKEN%| "%DOCKER%" login --username "%DOCKER_USER%" --password-stdin
                        if errorlevel 1 exit /b 1

                        echo ===== Push Versioned Image =====
                        "%DOCKER%" push "%IMAGE%:%BUILD_NUMBER%"
                        if errorlevel 1 exit /b 1

                        echo ===== Push Latest Image =====
                        "%DOCKER%" push "%IMAGE%:latest"
                        if errorlevel 1 exit /b 1

                        echo ===== DockerHub Logout =====
                        "%DOCKER%" logout
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }

        stage('Kubernetes Deploy') {
            when {
                expression { params.DEPLOY_TO_K8S }
            }

            steps {
                withCredentials([file(
                    credentialsId: 'coupon-kubeconfig',
                    variable: 'KUBECONFIG'
                )]) {
                    bat '''
                        @echo off

                        set "KUBECTL=C:\\Users\\mageshkumar sankar\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe"

                        echo ===== Apply Kubernetes Configuration =====
                        "%KUBECTL%" apply -f k8s/
                        if errorlevel 1 exit /b 1

                        echo ===== Update Deployment Image =====
                        "%KUBECTL%" set image deployment/coupon-system coupon-system=%IMAGE%:%BUILD_NUMBER%
                        if errorlevel 1 exit /b 1

                        echo ===== Wait for Deployment =====
                        "%KUBECTL%" rollout status deployment/coupon-system --timeout=120s
                        if errorlevel 1 exit /b 1

                        echo ===== Deployment Status =====
                        "%KUBECTL%" get deployment coupon-system
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }
    }

    post {
        always {
            bat '''
                @echo off
                if exist "%WORKSPACE%\\docker-auth" rmdir /s /q "%WORKSPACE%\\docker-auth"
                echo Coupon System CI/CD pipeline finished.
            '''
        }

        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the Console Output.'
        }
    }
}
