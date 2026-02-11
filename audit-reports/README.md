# Audit Reports Directory

This directory stores all generated PDF audit trail reports.

## Structure

PDFs are automatically created here when automation operations complete successfully.

## Naming Convention

```
Audit_{OperationType}_{ISO_Timestamp}.pdf
```

## Examples

- `Audit_Role_Creation_2026-02-11T11-15-30-123Z.pdf`
- `Audit_User_Creation_2026-02-11T12-30-45-678Z.pdf`
- `Audit_Complete_Setup_Flow_2026-02-11T14-20-10-456Z.pdf`

## Retention

PDFs are stored indefinitely for GCP compliance. Archive or delete manually as needed per your organization's retention policy.
