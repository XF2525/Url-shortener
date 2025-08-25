# GitHub Actions CI/CD Templates

This directory contains GitHub Actions workflows for automated CI/CD pipeline.

## Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)
**Triggers:** Push to main/develop, Pull Requests, Manual dispatch
**Features:**
- ✅ Code quality checks and testing
- 🐳 Multi-platform Docker image building
- 🔒 Security scanning with Trivy
- 🚀 Automated staging and production deployment
- ⚡ Performance testing
- 🔄 Automatic rollback capability
- 🧹 Resource cleanup

### 2. Pull Request Validation (`pr-validation.yml`)
**Triggers:** Pull Request events
**Features:**
- ✅ Code validation and testing
- 🔒 Security audit
- 📊 Performance impact analysis
- 🤖 Dependabot auto-merge

### 3. Release Management (`release.yml`)
**Triggers:** Git tags (v*), Manual dispatch
**Features:**
- 📦 Release artifact creation
- 🐳 Release Docker image building
- 📋 GitHub release creation with notes
- 🚀 Production deployment
- 🧪 Post-deployment testing

### 4. Scheduled Maintenance (`maintenance.yml`)
**Triggers:** Daily schedule (2 AM UTC), Manual dispatch
**Features:**
- 🔒 Security updates monitoring
- 📦 Dependency updates
- 🐳 Container image updates
- 📊 Performance monitoring
- 🧹 Cleanup tasks
- 📋 Health reporting

## Environment Variables

Configure the following secrets in your repository:
- `GITHUB_TOKEN` (automatically provided)

## Deployment Environments

### Staging
- **Branch:** develop
- **URL:** https://staging.url-shortener.com
- **Auto-deploy:** Yes

### Production
- **Branch:** main
- **URL:** https://url-shortener.com
- **Auto-deploy:** Yes (with approval)
- **Rollback:** Automatic on failure

## Container Registry

Images are published to GitHub Container Registry:
```
ghcr.io/XF2525/url-shortener:latest
ghcr.io/XF2525/url-shortener:v1.0.0
```

## Usage Examples

### Manual Deployment
```bash
# Trigger manual deployment to staging
gh workflow run ci-cd.yml -f deployment_target=staging

# Trigger manual deployment to production
gh workflow run ci-cd.yml -f deployment_target=production
```

### Release Creation
```bash
# Create a new release
git tag v1.0.0
git push origin v1.0.0

# Or trigger manual release
gh workflow run release.yml -f version=v1.0.0
```

### Security Maintenance
```bash
# Trigger security updates check
gh workflow run maintenance.yml
```

## Monitoring

### Health Checks
- Application: `http://localhost:3000/health`
- Container: Built-in Docker health checks
- Load Balancer: nginx health endpoints

### Performance Metrics
- Startup time: < 5 seconds
- Response time: < 100ms average
- Memory usage: < 512MB

### Security Scanning
- Container vulnerabilities: Trivy
- Dependency audit: npm audit
- SBOM generation: Anchore

## Troubleshooting

### Failed Deployments
1. Check workflow logs in GitHub Actions
2. Verify health check endpoints
3. Review container logs
4. Automatic rollback will trigger on failure

### Security Issues
1. Review security scan results
2. Update dependencies with security patches
3. Rebuild and redeploy containers

### Performance Issues
1. Review performance test results
2. Check resource usage metrics
3. Analyze application logs